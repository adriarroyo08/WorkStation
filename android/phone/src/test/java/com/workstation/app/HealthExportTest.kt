package com.workstation.app

import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.metadata.Device
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

private const val START = 1_794_000_000_000L
private const val HOUR = 3_600_000L
private val MADRID: ZoneId = ZoneId.of("Europe/Madrid")
private val ALL = setOf(HealthExporter.EXERCISE_PERMISSION, HealthExporter.HEART_RATE_PERMISSION)

private fun payload(hr: List<Pair<Long, Long>> = emptyList(), end: Long = START + HOUR) = HealthExportPayload("abc", "Pierna", START, end, hr, MADRID)

/** Como Health Connect: un clientRecordId ya escrito se sustituye, no se duplica. */
private class FakeStore(var granted: Set<String> = ALL) : HealthStore {
    val records = linkedMapOf<String, Record>()
    var failNext: Exception? = null
    var failHeartRate: Exception? = null
    var writes = 0

    override suspend fun grantedPermissions() = granted
    override suspend fun insert(records: List<Record>) {
        writes++
        failNext?.let { failNext = null; throw it }
        if (records.first() is HeartRateRecord) failHeartRate?.let { throw it }
        records.forEach { this.records[it.metadata.clientRecordId!!] = it }
    }
}

private fun export(store: HealthStore, p: HealthExportPayload) = runBlocking { HealthExporter(store).export(p) }

class HealthExportMapperTest {
    @Test
    fun `la sesion conserva inicio, fin y tipo reales`() {
        val r = HealthExportMapper.session(payload())
        assertEquals(Instant.ofEpochMilli(START), r.startTime)
        assertEquals(Instant.ofEpochMilli(START + HOUR), r.endTime)
        assertEquals(ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING, r.exerciseType)
        assertEquals("Pierna", r.title)
        assertEquals(Device.TYPE_PHONE, r.metadata.device?.type)
    }

    @Test
    fun `usa el desfase horario del huso de la sesion, no UTC`() {
        val r = HealthExportMapper.session(payload())
        assertEquals(MADRID.rules.getOffset(Instant.ofEpochMilli(START)), r.startZoneOffset)
        assertFalse(r.startZoneOffset == ZoneOffset.UTC)
    }

    @Test
    fun `el identificador es estable entre escrituras`() {
        assertEquals(HealthExportMapper.session(payload()).metadata.clientRecordId, HealthExportMapper.session(payload()).metadata.clientRecordId)
        assertEquals("workstation:session:abc", HealthExportMapper.session(payload()).metadata.clientRecordId)
    }

    @Test
    fun `sin muestras no hay registros de pulso`() {
        assertTrue(HealthExportMapper.heartRate(payload()).isEmpty())
    }

    @Test
    fun `agrupa las muestras por minuto y no marca un dispositivo inventado`() {
        val records = HealthExportMapper.heartRate(payload(listOf(START + 5_000 to 100L, START + 65_000 to 120L, START + 70_000 to 125L)))
        assertEquals(2, records.size)
        assertEquals(listOf(1, 2), records.map { it.samples.size })
        assertEquals("workstation:hr:abc:1", records[1].metadata.clientRecordId)
        assertEquals(Instant.ofEpochMilli(START + 60_000), records[1].startTime)
        assertEquals(Device.TYPE_UNKNOWN, records[0].metadata.device?.type)
    }

    @Test
    fun `descarta muestras fuera de la sesion o fuera de rango`() {
        val end = START + 30_000
        val records = HealthExportMapper.heartRate(payload(listOf(START - 1 to 100L, end to 100L, START + 1_000 to 0L, START + 2_000 to 301L, START + 3_000 to 90L), end))
        assertEquals(1, records.size)
        assertEquals(listOf(90L), records[0].samples.map { it.beatsPerMinute })
    }

    @Test
    fun `el ultimo registro de pulso no pasa del fin de la sesion`() {
        val end = START + 90_000
        val records = HealthExportMapper.heartRate(payload(listOf(START + 80_000 to 100L), end))
        assertEquals(Instant.ofEpochMilli(end), records.single().endTime)
    }
}

class HealthExportPayloadTest {
    private fun json(v: Int = 1, id: String = "abc", start: Long = START, end: Long = START + HOUR) =
        JSONObject().put("v", v).put("id", id).put("title", "Pierna").put("startMs", start).put("endMs", end)
            .put("hr", JSONArray().put(JSONArray().put(START + 1_000).put(120)))

    @Test
    fun `lee el contrato de la web`() {
        val p = HealthExportPayload.parse(json().toString(), MADRID)
        assertNotNull(p)
        assertEquals(listOf(START + 1_000 to 120L), p!!.hr)
    }

    @Test
    fun `rechaza versiones desconocidas, ids inseguros y duraciones no positivas`() {
        assertNull(HealthExportPayload.parse(json(v = 2).toString(), MADRID))
        assertNull(HealthExportPayload.parse(json(id = "../fuera").toString(), MADRID))
        assertNull(HealthExportPayload.parse(json(end = START).toString(), MADRID))
        assertNull(HealthExportPayload.parse("no es json", MADRID))
    }

    @Test
    fun `conserva el huso con el que se encolo`() {
        assertEquals(ZoneId.of("Asia/Tokyo"), HealthExportPayload.parse(json().put("tz", "Asia/Tokyo").toString(), MADRID)!!.zone)
        assertEquals(MADRID, HealthExportPayload.parse(json().put("tz", "zona-rara").toString(), MADRID)!!.zone)
    }
}

class HealthExporterTest {
    private val withHr = payload(listOf(START + 5_000 to 100L))

    @Test
    fun `escribe la sesion y su pulso`() {
        val store = FakeStore()
        assertEquals(HealthExportResult.DONE, export(store, withHr))
        assertEquals(setOf("workstation:session:abc", "workstation:hr:abc:0"), store.records.keys)
    }

    @Test
    fun `repetir la misma sesion no crea duplicados`() {
        val store = FakeStore()
        repeat(3) { export(store, withHr) }
        assertEquals(2, store.records.size)
    }

    @Test
    fun `sin permiso de ejercicio no escribe nada ni reintenta`() {
        val store = FakeStore(granted = emptySet())
        assertEquals(HealthExportResult.SKIPPED, export(store, withHr))
        assertEquals(0, store.writes)
    }

    @Test
    fun `sin permiso de pulso exporta solo la sesion`() {
        val store = FakeStore(granted = setOf(HealthExporter.EXERCISE_PERMISSION))
        assertEquals(HealthExportResult.DONE, export(store, withHr))
        assertEquals(setOf("workstation:session:abc"), store.records.keys)
    }

    @Test
    fun `permiso retirado durante la escritura de la sesion`() {
        val store = FakeStore().apply { failNext = SecurityException() }
        assertEquals(HealthExportResult.SKIPPED, export(store, withHr))
    }

    @Test
    fun `permiso de pulso retirado a mitad conserva la sesion escrita`() {
        val store = FakeStore().apply { failHeartRate = SecurityException() }
        assertEquals(HealthExportResult.DONE, export(store, withHr))
        assertEquals(setOf("workstation:session:abc"), store.records.keys)
    }

    @Test
    fun `un fallo transitorio pide reintento y el reintento no duplica`() {
        val store = FakeStore().apply { failHeartRate = IOException() }
        assertEquals(HealthExportResult.RETRY, export(store, withHr))
        store.failHeartRate = null
        assertEquals(HealthExportResult.DONE, export(store, withHr))
        assertEquals(2, store.records.size)
    }

    @Test
    fun `datos rechazados no se reintentan`() {
        val store = FakeStore().apply { failNext = IllegalArgumentException() }
        assertEquals(HealthExportResult.FAILED, export(store, withHr))
    }

    @Test
    fun `si no se pueden consultar los permisos se reintenta`() {
        val store = object : HealthStore {
            override suspend fun grantedPermissions(): Set<String> = throw IllegalStateException()
            override suspend fun insert(records: List<Record>) = Unit
        }
        assertEquals(HealthExportResult.RETRY, export(store, withHr))
    }
}
