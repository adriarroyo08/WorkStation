package com.workstation.app

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object Notifications {
    private const val CH_WORKOUT = "workout"
    private const val CH_REST = "rest"
    const val ID_ONGOING = 1
    const val ID_REST = 2
    private val VIBRATION = longArrayOf(0, 300, 150, 300, 150, 500)

    fun ensureChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CH_WORKOUT, ctx.getString(R.string.channel_workout), NotificationManager.IMPORTANCE_LOW).apply {
                setShowBadge(false)
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_REST, ctx.getString(R.string.channel_rest), NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
                vibrationPattern = VIBRATION
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build(),
                )
            },
        )
    }

    fun openApp(ctx: Context): PendingIntent = PendingIntent.getActivity(
        ctx,
        0,
        Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    /** Notificación fija con cronómetro (o cuenta atrás del descanso). Solo en el móvil: el reloj tiene su app. */
    @SuppressLint("MissingPermission")
    fun showOngoing(ctx: Context, name: String, startedAt: Long, restEnd: Long) = notify(ctx, ID_ONGOING, ongoing(ctx, name, startedAt, restEnd))

    fun ongoing(ctx: Context, name: String, startedAt: Long, restEnd: Long): android.app.Notification {
        ensureChannels(ctx)
        val resting = restEnd > System.currentTimeMillis()
        return NotificationCompat.Builder(ctx, CH_WORKOUT)
            .setSmallIcon(R.drawable.ic_stat_workout)
            .setContentTitle(name)
            .setContentText(if (resting) "Descansando…" else "Entrenamiento en curso")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setLocalOnly(true)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setUsesChronometer(true)
            .setChronometerCountDown(resting)
            .setWhen(if (resting) restEnd else startedAt)
            .setShowWhen(true)
            .setContentIntent(openApp(ctx))
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    fun hideOngoing(ctx: Context) = NotificationManagerCompat.from(ctx).cancel(ID_ONGOING)

    /** Aviso de fin de descanso. Se replica en el reloj (vibra en la muñeca aunque su app esté cerrada). */
    fun showRestOver(ctx: Context, label: String) {
        val n = NotificationCompat.Builder(ctx, CH_REST)
            .setSmallIcon(R.drawable.ic_stat_workout)
            .setContentTitle("¡Descanso terminado!")
            .setContentText("$label · siguiente serie 💪")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVibrate(VIBRATION)
            .setAutoCancel(true)
            .setTimeoutAfter(60_000)
            .setContentIntent(openApp(ctx))
            .build()
        notify(ctx, ID_REST, n)
    }

    @SuppressLint("MissingPermission")
    private fun notify(ctx: Context, id: Int, n: android.app.Notification) {
        val nm = NotificationManagerCompat.from(ctx)
        if (!nm.areNotificationsEnabled()) return
        try {
            nm.notify(id, n)
        } catch (_: SecurityException) {
            // Permiso de notificaciones denegado.
        }
    }
}
