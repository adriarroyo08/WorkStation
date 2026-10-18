package com.workstation.app

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.math.roundToInt

/** Sensor de pulso del reloj. Envía una lectura al móvil como mucho cada 5 s. */
class HeartRate(context: Context, private val onSample: (Int) -> Unit) : SensorEventListener {
    private val sm = context.getSystemService(SensorManager::class.java)
    private val sensor: Sensor? = sm?.getDefaultSensor(Sensor.TYPE_HEART_RATE)
    private val _bpm = MutableStateFlow<Int?>(null)
    val bpm: StateFlow<Int?> = _bpm
    private var lastSent = 0L
    private var running = false

    val available get() = sensor != null

    fun start() {
        if (running || sensor == null) return
        running = sm?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL) == true
    }

    fun stop() {
        if (!running) return
        sm?.unregisterListener(this)
        running = false
        _bpm.value = null
    }

    override fun onSensorChanged(event: SensorEvent) {
        val v = event.values.firstOrNull()?.roundToInt() ?: return
        if (v <= 0 || event.accuracy == SensorManager.SENSOR_STATUS_NO_CONTACT || event.accuracy == SensorManager.SENSOR_STATUS_UNRELIABLE) return
        _bpm.value = v
        val now = System.currentTimeMillis()
        if (now - lastSent >= 5000) {
            lastSent = now
            onSample(v)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}
