package com.workstation.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.records.Record
import androidx.work.BackoffPolicy
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.time.ZoneId
import java.util.concurrent.TimeUnit

/** Estado y cola de la exportación a Health Connect. El detalle del diseño está en docs/health-connect.md. */
object HealthConnect {
    private const val PREFS = "health_connect"
    private const val KEY_ENABLED = "enabled"
    private const val WORK_TAG = "health_connect_export"
    private const val TAG = "HealthConnect"
    private const val PROVIDER = "com.google.android.apps.healthdata"

    val PERMISSIONS = setOf(HealthExporter.EXERCISE_PERMISSION, HealthExporter.HEART_RATE_PERMISSION)

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    fun isEnabled(ctx: Context) = prefs(ctx).getBoolean(KEY_ENABLED, false)
    fun setEnabled(ctx: Context, on: Boolean) = prefs(ctx).edit().putBoolean(KEY_ENABLED, on).apply()

    fun availability(ctx: Context): String = when (HealthConnectClient.getSdkStatus(ctx, PROVIDER)) {
        HealthConnectClient.SDK_AVAILABLE -> "available"
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
        else -> "unavailable"
    }

    private fun client(ctx: Context) = HealthConnectClient.getOrCreate(ctx)

    fun store(ctx: Context) = object : HealthStore {
        override suspend fun grantedPermissions() = client(ctx).permissionController.getGrantedPermissions()
        override suspend fun insert(records: List<Record>) {
            client(ctx).insertRecords(records)
        }
    }

    suspend fun status(ctx: Context): JSONObject {
        val availability = availability(ctx)
        val granted = if (availability == "available") runCatching { store(ctx).grantedPermissions() }.getOrDefault(emptySet()) else emptySet()
        return JSONObject()
            .put("availability", availability)
            .put("enabled", isEnabled(ctx))
            .put("exercise", HealthExporter.EXERCISE_PERMISSION in granted)
            .put("heartRate", HealthExporter.HEART_RATE_PERMISSION in granted)
    }

    private fun outbox(ctx: Context) = File(ctx.noBackupFilesDir, "health-connect").apply { mkdirs() }
    private fun outboxFile(ctx: Context, id: String) = File(outbox(ctx), "$id.json")

    /** Guarda la sesión y programa su escritura. Sin activar, no se guarda nada. false si no se ha encolado. */
    fun enqueue(ctx: Context, json: String): Boolean {
        if (!isEnabled(ctx)) return false
        return runCatching {
            val zone = ZoneId.systemDefault()
            val payload = HealthExportPayload.parse(json, zone) ?: return false
            outboxFile(ctx, payload.id).writeText(JSONObject(json).put("tz", zone.id).toString())
            val request = OneTimeWorkRequestBuilder<HealthExportWorker>()
                .setInputData(workDataOf(HealthExportWorker.KEY_ID to payload.id))
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .addTag(WORK_TAG)
                .build()
            // KEEP: si esta sesión ya está en cola, no hace falta otra escritura.
            WorkManager.getInstance(ctx).enqueueUniqueWork("$WORK_TAG:${payload.id}", ExistingWorkPolicy.KEEP, request)
            true
        }.getOrElse {
            Log.w(TAG, "No se pudo encolar la exportación: ${it.javaClass.simpleName}")
            false
        }
    }

    /** Retirar la activación también cancela lo pendiente. Lo ya escrito se gestiona desde Health Connect. */
    fun disable(ctx: Context) {
        setEnabled(ctx, false)
        WorkManager.getInstance(ctx).cancelAllWorkByTag(WORK_TAG)
        outbox(ctx).listFiles()?.forEach { it.delete() }
    }

    /** Carga una sesión de la cola; null si ya no está o no es válida. */
    fun load(ctx: Context, id: String): HealthExportPayload? =
        runCatching { HealthExportPayload.parse(outboxFile(ctx, id).readText(), ZoneId.systemDefault()) }.getOrNull()

    fun remove(ctx: Context, id: String) {
        outboxFile(ctx, id).delete()
    }

    /** Pantalla de permisos y datos de Health Connect o, si falta el proveedor, su ficha en la tienda. */
    fun openIntent(ctx: Context): Intent =
        if (availability(ctx) == "update_required") {
            Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$PROVIDER&url=healthconnect%3A%2F%2Fonboarding"))
        } else {
            Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
        }
}

/** Escribe una sesión de la cola. Sobrevive al cierre de la app y a reinicios; el contenido está en el fichero de la cola. */
class HealthExportWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val id = inputData.getString(KEY_ID) ?: return Result.failure()
        val payload = HealthConnect.load(ctx, id) ?: return Result.failure()
        val abandon = { result: Result -> HealthConnect.remove(ctx, id); result }

        if (!HealthConnect.isEnabled(ctx) || HealthConnect.availability(ctx) != "available") return abandon(Result.success())
        return when (HealthExporter(HealthConnect.store(ctx)).export(payload)) {
            HealthExportResult.DONE, HealthExportResult.SKIPPED -> abandon(Result.success())
            HealthExportResult.FAILED -> abandon(Result.failure())
            HealthExportResult.RETRY -> if (runAttemptCount + 1 >= MAX_ATTEMPTS) abandon(Result.failure()) else Result.retry()
        }
    }

    companion object {
        const val KEY_ID = "id"
        private const val MAX_ATTEMPTS = 8 // Con la espera exponencial desde 1 min, unas 2 h.
    }
}

/** Parte de la exportación que necesita la Activity: pedir permisos y avisar a la web. */
class HealthConnectUi(private val activity: MainActivity) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val requestPermissions = activity.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        val ok = HealthExporter.EXERCISE_PERMISSION in granted
        HealthConnect.setEnabled(activity, ok)
        denied = !ok
        refresh()
    }

    // Vive aquí, no en el mensaje: al volver de la pantalla de permisos, onResume también refresca el estado.
    @Volatile
    private var denied = false

    fun refresh() {
        scope.launch {
            activity.sendToWeb(JSONObject().put("kind", "health_connect").put("status", HealthConnect.status(activity)).put("denied", denied))
        }
    }

    /** Activa si ya hay permiso; si no, abre la pantalla de permisos de Health Connect. */
    fun enable() {
        denied = false
        scope.launch {
            if (HealthConnect.availability(activity) != "available") return@launch refresh()
            val granted = runCatching { HealthConnect.store(activity).grantedPermissions() }.getOrDefault(emptySet())
            if (granted.containsAll(HealthConnect.PERMISSIONS)) {
                HealthConnect.setEnabled(activity, true)
                refresh()
            } else {
                activity.runOnUiThread { requestPermissions.launch(HealthConnect.PERMISSIONS) }
            }
        }
    }

    fun disable() {
        denied = false
        HealthConnect.disable(activity)
        refresh()
    }

    fun open() = activity.runOnUiThread {
        try {
            activity.startActivity(HealthConnect.openIntent(activity))
        } catch (e: Exception) {
            Toast.makeText(activity, "No se pudo abrir Health Connect", Toast.LENGTH_LONG).show()
        }
    }
}
