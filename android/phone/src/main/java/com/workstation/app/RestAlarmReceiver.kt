package com.workstation.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/** Alarma del fin de descanso: suena aunque la pantalla esté apagada o la web en segundo plano. */
class RestAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        Notifications.showRestOver(ctx, intent.getStringExtra(EXTRA_LABEL) ?: "Workstation")
    }

    companion object {
        private const val EXTRA_LABEL = "label"

        private fun pending(ctx: Context, label: String?): PendingIntent = PendingIntent.getBroadcast(
            ctx,
            1,
            Intent(ctx, RestAlarmReceiver::class.java).putExtra(EXTRA_LABEL, label),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        fun schedule(ctx: Context, endAtMs: Long, label: String) {
            if (endAtMs <= System.currentTimeMillis()) return
            val am = ctx.getSystemService(AlarmManager::class.java)
            val pi = pending(ctx, label)
            val exactAllowed = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
            if (exactAllowed) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAtMs, pi)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAtMs, pi)
        }

        fun cancel(ctx: Context) {
            ctx.getSystemService(AlarmManager::class.java).cancel(pending(ctx, null))
        }
    }
}
