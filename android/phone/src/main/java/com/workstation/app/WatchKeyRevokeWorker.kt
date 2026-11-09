package com.workstation.app

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Completa las revocaciones pendientes en cuanto hay red, aunque la app esté cerrada o el móvil se reinicie.
 * Las keys se quedan cifradas en WatchWorkouts: la base de datos de WorkManager no las guarda.
 */
class WatchKeyRevokeWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
    override fun doWork(): Result = if (WatchWorkouts.revokePending(applicationContext)) Result.success() else Result.retry()

    companion object {
        private const val NAME = "watch_key_revoke"

        fun schedule(ctx: Context) {
            val request = OneTimeWorkRequestBuilder<WatchKeyRevokeWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()
            // REPLACE: una entrada añadida con el trabajo ya en marcha no debe quedarse fuera de su lista.
            WorkManager.getInstance(ctx).enqueueUniqueWork(NAME, ExistingWorkPolicy.REPLACE, request)
        }
    }
}
