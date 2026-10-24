package com.workstation.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Pulso durante el entrenamiento como servicio en primer plano (tipo "health"): sigue midiendo aunque bajes
 * la muñeca o vuelva la esfera. Se para al terminar el entrenamiento (lo decide la app del reloj).
 */
class HeartRateService : Service(), DataClient.OnDataChangedListener {
    private var hr: HeartRate? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (hr != null) return START_NOT_STICKY
        val n = notification()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
        try {
            ServiceCompat.startForeground(this, ID, n, type)
        } catch (_: Exception) {
            stopSelf() // sin permiso de sensores: no hay pulso en segundo plano
            return START_NOT_STICKY
        }
        hr = HeartRate(this, onValue = { _bpm.value = it }) { bpm -> sendToPhone(Cmd.heartRate(bpm).toString()) }.also { it.start() }
        Wearable.getDataClient(this).addListener(this)
        return START_NOT_STICKY
    }

    // Si el entreno termina (en el móvil o en el reloj) aunque la app del reloj no esté abierta, se para el sensor.
    override fun onDataChanged(events: DataEventBuffer) {
        var ended = false
        events.forEach { e ->
            if (e.type == DataEvent.TYPE_CHANGED && e.dataItem.uri.path == PhoneLink.PATH_STATE) {
                val json = DataMapItem.fromDataItem(e.dataItem).dataMap.getString(PhoneLink.KEY_JSON)
                if (json != null && parseState(json)?.active == null) ended = true
            }
        }
        events.release()
        if (ended) stopSelf()
    }

    override fun onDestroy() {
        Wearable.getDataClient(this).removeListener(this)
        hr?.stop()
        hr = null
        _bpm.value = null
        super.onDestroy()
    }

    private fun sendToPhone(json: String) {
        val bytes = json.toByteArray(Charsets.UTF_8)
        Wearable.getNodeClient(this).connectedNodes.addOnSuccessListener { nodes ->
            nodes.forEach { Wearable.getMessageClient(this).sendMessage(it.id, PhoneLink.PATH_CMD, bytes) }
        }
    }

    private fun notification(): android.app.Notification {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel(CHANNEL, "Entrenamiento", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle("Entrenamiento en curso")
            .setContentText("Midiendo el pulso")
            .setOngoing(true)
            .setContentIntent(open)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .build()
    }

    companion object {
        private const val ID = 7
        private const val CHANNEL = "workout"
        private val _bpm = MutableStateFlow<Int?>(null)
        val bpm: StateFlow<Int?> = _bpm

        fun start(ctx: Context) = runCatching { ContextCompat.startForegroundService(ctx, Intent(ctx, HeartRateService::class.java)) }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, HeartRateService::class.java))
        }
    }
}
