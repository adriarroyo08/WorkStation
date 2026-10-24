package com.workstation.app

import org.json.JSONObject

// Espejo de WatchState (shared/session.ts). El móvil es la fuente de verdad: el reloj solo muestra y manda comandos.

data class WSet(
    val type: String,
    val weight: Double?,
    val reps: Int?,
    val durationSec: Int?,
    val done: Boolean,
    val prevWeight: Double?,
    val prevReps: Int?,
)

data class WExercise(val name: String, val kind: String, val superset: Boolean, val sets: List<WSet>)

data class Cursor(val ei: Int, val si: Int)

data class Active(
    val id: String,
    val name: String,
    val startedAt: Long,
    val restEnd: Long?,
    val restTotal: Int,
    val cursor: Cursor?,
    val setsDone: Int,
    val setsTotal: Int,
    val exercises: List<WExercise>,
)

data class RoutineItem(val id: String, val name: String, val exercises: Int)

data class WatchState(val sentAt: Long, val active: Active?, val routines: List<RoutineItem>)

private fun JSONObject.optDoubleOrNull(k: String): Double? = if (has(k) && !isNull(k)) optDouble(k) else null
private fun JSONObject.optIntOrNull(k: String): Int? = if (has(k) && !isNull(k)) optInt(k) else null
private fun JSONObject.optLongOrNull(k: String): Long? = if (has(k) && !isNull(k)) optLong(k) else null

fun parseState(json: String): WatchState? = runCatching {
    val o = JSONObject(json)
    val routines = o.optJSONArray("routines")?.let { arr ->
        (0 until arr.length()).map { i ->
            val r = arr.getJSONObject(i)
            RoutineItem(r.getString("id"), r.getString("name"), r.optInt("exercises"))
        }
    } ?: emptyList()
    val a = o.optJSONObject("active")
    val active = a?.let {
        val exArr = it.getJSONArray("exercises")
        Active(
            id = it.getString("id"),
            name = it.getString("name"),
            startedAt = it.getLong("startedAt"),
            restEnd = it.optLongOrNull("restEnd"),
            restTotal = it.optInt("restTotal"),
            cursor = it.optJSONObject("cursor")?.let { c -> Cursor(c.getInt("ei"), c.getInt("si")) },
            setsDone = it.optInt("setsDone"),
            setsTotal = it.optInt("setsTotal"),
            exercises = (0 until exArr.length()).map { i ->
                val e = exArr.getJSONObject(i)
                val sets = e.getJSONArray("sets")
                WExercise(
                    name = e.getString("name"),
                    kind = e.optString("kind", "weight_reps"),
                    superset = e.optBoolean("superset"),
                    sets = (0 until sets.length()).map { j ->
                        val s = sets.getJSONObject(j)
                        WSet(
                            type = s.optString("type", "normal"),
                            weight = s.optDoubleOrNull("weight"),
                            reps = s.optIntOrNull("reps"),
                            durationSec = s.optIntOrNull("durationSec"),
                            done = s.optBoolean("done"),
                            prevWeight = s.optDoubleOrNull("prevWeight"),
                            prevReps = s.optIntOrNull("prevReps"),
                        )
                    },
                )
            },
        )
    }
    weightUnit = if (o.optString("unit", "kg") == "lb") "lb" else "kg"
    WatchState(o.optLong("sentAt"), active, routines)
}.getOrNull()

object Cmd {
    fun hello() = JSONObject().put("type", "hello")
    // wid y ex identifican el entreno y el ejercicio: el móvil ignora el comando si ya no coinciden
    // (p. ej. se reordenó o se borró algo mientras el reloj mostraba un estado anterior).
    fun completeSet(wid: String, ex: String, ei: Int, si: Int, weight: Double?, reps: Int?, durationSec: Int?) = JSONObject()
        .put("type", "complete_set").put("wid", wid).put("ex", ex).put("ei", ei).put("si", si)
        .apply {
            weight?.let { put("weight", it) }
            reps?.let { put("reps", it) }
            durationSec?.let { put("durationSec", it) }
        }
    fun uncompleteSet(wid: String, ex: String, ei: Int, si: Int) = JSONObject().put("type", "uncomplete_set").put("wid", wid).put("ex", ex).put("ei", ei).put("si", si)
    fun restAdd(sec: Int) = JSONObject().put("type", "rest_add").put("sec", sec)
    fun restSkip() = JSONObject().put("type", "rest_skip")
    fun startRoutine(id: String) = JSONObject().put("type", "start_routine").put("id", id)
    fun startEmpty() = JSONObject().put("type", "start_empty")
    fun finish() = JSONObject().put("type", "finish")
    fun heartRate(bpm: Int) = JSONObject().put("type", "hr").put("bpm", bpm)
}

fun formatKg(v: Double?): String = when {
    v == null -> "–"
    v % 1.0 == 0.0 -> v.toInt().toString()
    else -> "%.2f".format(v).trimEnd('0').trimEnd('.', ',')
}

// Unidad visible que llega del móvil. Los pesos se reciben y envían siempre en kg.
var weightUnit = "kg"
private const val LB_PER_KG = 2.2046226218

/** Peso en kg mostrado en la unidad del usuario (lb redondeadas a 0,5). */
fun formatWeight(kg: Double?): String =
    if (kg == null) "–" else if (weightUnit == "lb") formatKg(Math.round(kg * LB_PER_KG * 2) / 2.0) else formatKg(kg)

/** Incremento de los botones −/+ en kg: 2,5 kg o 5 lb. */
fun weightStepKg(): Double = if (weightUnit == "lb") 5 / LB_PER_KG else 2.5

fun clock(sec: Long): String {
    val s = sec.coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val r = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, r) else "%d:%02d".format(m, r)
}
