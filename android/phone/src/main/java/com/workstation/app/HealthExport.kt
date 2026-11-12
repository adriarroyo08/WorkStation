package com.workstation.app

import android.os.Build
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import kotlin.math.min

/** Sesión a exportar (ver HealthExport en shared/health-connect.ts). `zone` se fija al encolar: un reintento tras cambiar de huso no altera la sesión. */
data class HealthExportPayload(
    val id: String,
    val title: String,
    val startMs: Long,
    val endMs: Long,
    val hr: List<Pair<Long, Long>>,
    val zone: ZoneId,
) {
    companion object {
        // El id acaba en un nombre de fichero y en clientRecordId.
        private val SAFE_ID = Regex("[A-Za-z0-9_-]{1,64}")

        /** null si el JSON no es una sesión válida: una versión desconocida del contrato no se interpreta a medias. */
        fun parse(json: String, defaultZone: ZoneId): HealthExportPayload? = runCatching {
            val o = JSONObject(json)
            val id = o.getString("id")
            val startMs = o.getLong("startMs")
            val endMs = o.getLong("endMs")
            if (o.getInt("v") != 1 || !SAFE_ID.matches(id) || endMs <= startMs) return null
            val samples = o.optJSONArray("hr")
            val hr = (0 until (samples?.length() ?: 0)).map { i -> samples!!.getJSONArray(i).let { it.getLong(0) to it.getLong(1) } }
            val zone = o.optString("tz").takeIf { it.isNotEmpty() }?.let { runCatching { ZoneId.of(it) }.getOrNull() } ?: defaultZone
            HealthExportPayload(id, o.optString("title"), startMs, endMs, hr, zone)
        }.getOrNull()
    }
}

/** Convierte una sesión en registros. Los clientRecordId salen solo de la sesión: repetir la escritura sobrescribe, no duplica. */
object HealthExportMapper {
    private const val RECORD_VERSION = 1L
    private const val MINUTE_MS = 60_000L

    fun sessionRecordId(id: String) = "workstation:session:$id"
    fun heartRateRecordId(id: String, minute: Long) = "workstation:hr:$id:$minute"

    fun session(p: HealthExportPayload): ExerciseSessionRecord {
        val start = Instant.ofEpochMilli(p.startMs)
        val end = Instant.ofEpochMilli(p.endMs)
        return ExerciseSessionRecord(
            startTime = start,
            startZoneOffset = p.zone.rules.getOffset(start),
            endTime = end,
            endZoneOffset = p.zone.rules.getOffset(end),
            exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
            title = p.title.takeIf { it.isNotBlank() },
            metadata = Metadata.activelyRecorded(
                device = Device(type = Device.TYPE_PHONE, manufacturer = Build.MANUFACTURER, model = Build.MODEL),
                clientRecordId = sessionRecordId(p.id),
                clientRecordVersion = RECORD_VERSION,
            ),
        )
    }

    /** Un registro por minuto de sesión, como recomienda Health Connect. Sin muestras reales, ninguno. */
    fun heartRate(p: HealthExportPayload): List<HeartRateRecord> =
        p.hr.filter { (t, bpm) -> t >= p.startMs && t < p.endMs && bpm in 1..300 }
            .sortedBy { it.first }
            .groupBy { (t, _) -> (t - p.startMs) / MINUTE_MS }
            .map { (minute, samples) ->
                val start = Instant.ofEpochMilli(p.startMs + minute * MINUTE_MS)
                val end = Instant.ofEpochMilli(min(p.startMs + (minute + 1) * MINUTE_MS, p.endMs))
                HeartRateRecord(
                    startTime = start,
                    startZoneOffset = p.zone.rules.getOffset(start),
                    endTime = end,
                    endZoneOffset = p.zone.rules.getOffset(end),
                    samples = samples.map { (t, bpm) -> HeartRateRecord.Sample(Instant.ofEpochMilli(t), bpm) },
                    metadata = Metadata.activelyRecorded(
                        // Las muestras no guardan si vinieron del reloj o de un pulsómetro: no se inventa.
                        device = Device(type = Device.TYPE_UNKNOWN),
                        clientRecordId = heartRateRecordId(p.id, minute),
                        clientRecordVersion = RECORD_VERSION,
                    ),
                )
            }
}

/** Lo único que el exportador necesita de Health Connect. */
interface HealthStore {
    suspend fun grantedPermissions(): Set<String>
    suspend fun insert(records: List<Record>)
}

enum class HealthExportResult {
    /** Sesión escrita (con o sin pulso). */
    DONE,

    /** Sin permiso de ejercicio: se abandona sin reintentar. */
    SKIPPED,

    /** Fallo transitorio: repetir más tarde es seguro gracias al clientRecordId. */
    RETRY,

    /** Datos rechazados: repetir daría el mismo error. */
    FAILED,
}

class HealthExporter(private val store: HealthStore) {
    suspend fun export(p: HealthExportPayload): HealthExportResult {
        val granted = try {
            store.grantedPermissions()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            return HealthExportResult.RETRY
        }
        if (EXERCISE_PERMISSION !in granted) return HealthExportResult.SKIPPED

        attempt(onDenied = HealthExportResult.SKIPPED) { store.insert(listOf(HealthExportMapper.session(p))) }?.let { return it }

        if (HEART_RATE_PERMISSION in granted) {
            for (chunk in HealthExportMapper.heartRate(p).chunked(MAX_RECORDS_PER_WRITE)) {
                // Si retiran el permiso de pulso a mitad, la sesión ya escrita sigue siendo válida.
                attempt(onDenied = HealthExportResult.DONE) { store.insert(chunk) }?.let { return it }
            }
        }
        return HealthExportResult.DONE
    }

    /** null si ha ido bien; si no, el resultado con el que termina la exportación. */
    private suspend fun attempt(onDenied: HealthExportResult, write: suspend () -> Unit): HealthExportResult? = try {
        write()
        null
    } catch (e: CancellationException) {
        throw e
    } catch (e: SecurityException) {
        onDenied
    } catch (e: IllegalArgumentException) {
        HealthExportResult.FAILED
    } catch (e: Exception) {
        HealthExportResult.RETRY
    }

    companion object {
        val EXERCISE_PERMISSION = HealthPermission.getWritePermission(ExerciseSessionRecord::class)
        val HEART_RATE_PERMISSION = HealthPermission.getWritePermission(HeartRateRecord::class)
        private const val MAX_RECORDS_PER_WRITE = 1000
    }
}
