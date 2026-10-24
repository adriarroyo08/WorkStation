package com.workstation.app

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Servicio en primer plano mientras hay un entrenamiento en curso. Muestra la notificación fija y evita que
 * Android congele o cierre la app con la pantalla apagada (los comandos del reloj se siguen procesando).
 */
class WorkoutService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val name = intent?.getStringExtra(EXTRA_NAME) ?: "Workstation"
        val started = intent?.getLongExtra(EXTRA_STARTED, System.currentTimeMillis()) ?: System.currentTimeMillis()
        val rest = intent?.getLongExtra(EXTRA_REST, 0L) ?: 0L
        val n = Notifications.ongoing(this, name, started, rest)
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        try {
            ServiceCompat.startForeground(this, Notifications.ID_ONGOING, n, type)
        } catch (_: Exception) {
            // Sin permiso para servicio en primer plano: al menos la notificación normal.
            Notifications.showOngoing(this, name, started, rest)
            stopSelf()
        }
        return START_NOT_STICKY
    }

    companion object {
        private const val EXTRA_NAME = "name"
        private const val EXTRA_STARTED = "started"
        private const val EXTRA_REST = "rest"

        /** Arranca o actualiza el servicio (nombre, inicio y fin del descanso). */
        fun update(ctx: Context, name: String, startedAt: Long, restEnd: Long) {
            val i = Intent(ctx, WorkoutService::class.java)
                .putExtra(EXTRA_NAME, name)
                .putExtra(EXTRA_STARTED, startedAt)
                .putExtra(EXTRA_REST, restEnd)
            try {
                ContextCompat.startForegroundService(ctx, i)
            } catch (_: Exception) {
                // Android no deja arrancarlo desde segundo plano: notificación normal.
                Notifications.showOngoing(ctx, name, startedAt, restEnd)
            }
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, WorkoutService::class.java))
            Notifications.hideOngoing(ctx)
        }
    }
}
