package com.workstation.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private lateinit var link: PhoneLink
    private val hasHrSensor by lazy { getSystemService(android.hardware.SensorManager::class.java)?.getDefaultSensor(android.hardware.Sensor.TYPE_HEART_RATE) != null }
    private var askedHr = false

    private val hrPermission = if (Build.VERSION.SDK_INT >= 36) "android.permission.health.READ_HEART_RATE" else Manifest.permission.BODY_SENSORS
    private val askPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> if (ok) syncHeartRate() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        LocalStore.init(this)
        link = PhoneLink(this)
        setContent {
            val state by link.state.collectAsState()
            val library by link.library.collectAsState()
            val local by LocalStore.session.collectAsState()
            val pending by LocalStore.pending.collectAsState()
            val connected by link.connected.collectAsState()
            val bpm by HeartRateService.bpm.collectAsState()
            WatchApp(
                state = state,
                library = library,
                local = local,
                pending = pending,
                connected = connected,
                bpm = bpm,
                send = link::send,
                vibrate = { vibrateRestEnd(this) },
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

    /**
     * El pulso solo se mide mientras hay un entrenamiento en curso, del móvil o del reloj (ahorra batería), en un servicio en primer
     * plano para que siga aunque la app del reloj no esté en pantalla.
     */
    private fun syncHeartRate() {
        val active = link.state.value?.active != null || LocalStore.session.value != null
        if (!active || !hasHrSensor) {
            HeartRateService.stop(this)
            return
        }
        if (ContextCompat.checkSelfPermission(this, hrPermission) == PackageManager.PERMISSION_GRANTED) HeartRateService.start(this)
        else if (!askedHr) {
            askedHr = true
            askPermission.launch(hrPermission)
        }
    }

    private fun keepScreenOn(on: Boolean) {
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}
