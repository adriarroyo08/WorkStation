package com.workstation.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private lateinit var link: PhoneLink
    private lateinit var heartRate: HeartRate
    private var askedHr = false

    private val hrPermission = if (Build.VERSION.SDK_INT >= 36) "android.permission.health.READ_HEART_RATE" else Manifest.permission.BODY_SENSORS
    private val askPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> if (ok) syncHeartRate() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        link = PhoneLink(this)
        heartRate = HeartRate(this) { bpm -> link.send(Cmd.heartRate(bpm)) }
        setContent {
            val state by link.state.collectAsState()
            val connected by link.connected.collectAsState()
            val bpm by heartRate.bpm.collectAsState()
            WatchApp(
                state = state,
                connected = connected,
                bpm = bpm,
                send = link::send,
                vibrate = ::vibrate,
                keepScreenOn = ::keepScreenOn,
                onActiveChanged = { syncHeartRate() },
            )
        }
    }

    override fun onResume() {
        super.onResume()
        link.start()
        syncHeartRate()
    }

    override fun onPause() {
        link.stop()
        super.onPause()
    }

    override fun onDestroy() {
        heartRate.stop()
        super.onDestroy()
    }

    /** El sensor solo se enciende mientras hay un entrenamiento en curso (ahorra batería). */
    private fun syncHeartRate() {
        val active = link.state.value?.active != null
        if (!active || !heartRate.available) {
            heartRate.stop()
            return
        }
        if (ContextCompat.checkSelfPermission(this, hrPermission) == PackageManager.PERMISSION_GRANTED) heartRate.start()
        else if (!askedHr) {
            askedHr = true
            askPermission.launch(hrPermission)
        }
    }

    private fun vibrate() {
        getSystemService(Vibrator::class.java)?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 300, 150, 300, 150, 500), -1))
    }

    private fun keepScreenOn(on: Boolean) {
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}
