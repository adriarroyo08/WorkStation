package com.workstation.app

import android.content.Context
import android.content.SharedPreferences
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID
import kotlin.math.ceil

// Entreno hecho en el propio reloj (sin el móvil). Mismo modelo que Workout (shared/types.ts).

data class LSet(val type: String = "normal", val weight: Double? = null, val reps: Int? = null, val durationSec: Int? = null, val done: Boolean = false)

data class LExercise(val exerciseId: String, val restSec: Int?, val supersetId: String?, val sets: List<LSet>)

data class LWorkout(
    val id: String,
    val name: String,
    val startedAt: Long,
    val routineId: String?,
    val exercises: List<LExercise>,
    val endedAt: Long? = null,
    val restEnd: Long? = null,
    val restTotal: Int = 0,
    val hr: List<Pair<Int, Int>> = emptyList(), // [segundos desde el inicio, ppm]
)

// Biblioteca que manda el móvil (shared/watch-library.ts).
data class LibExercise(val id: String, val name: String, val kind: String)
data class LibRoutine(val id: String, val name: String, val folder: String?, val exercises: List<LExercise>)
data class Recent(val id: String, val name: String, val start: Long, val end: Long?, val sets: Int, val volume: Double)

data class Library(
    val sentAt: Long,
    val unit: String,
    val defaultRest: Int,
    val exercises: List<LibExercise>,
    val routines: List<LibRoutine>,
    val prev: Map<String, List<LSet>>,
    val recent: List<Recent>,
) {
    val byId = exercises.associateBy { it.id }
}

private val KINDS = setOf("weight_reps", "reps", "assisted", "duration", "distance")

// ---- Lógica (puerto de shared/session.ts y shared/stats.ts) ----

/** Empareja la n-ésima serie de calentamiento con la n-ésima anterior, y lo mismo con las efectivas. */
fun alignPrevious(sets: List<LSet>, prev: List<LSet>): List<LSet?> {
    val pw = prev.filter { it.type == "warmup" }
    val pn = prev.filter { it.type != "warmup" }
    var w = 0
    var n = 0
    return sets.map { if (it.type == "warmup") pw.getOrNull(w++) else pn.getOrNull(n++) }
}

/**
 * Marca/desmarca una serie. Si no se indicó nada, usa los valores de la sesión anterior.
 * Devuelve el entreno nuevo y los segundos de descanso que hay que iniciar (0 = ninguno).
 */
fun toggleSet(w: LWorkout, ei: Int, si: Int, prev: List<LSet>, defaultRest: Int, weight: Double? = null, reps: Int? = null, durationSec: Int? = null): Pair<LWorkout, Int> {
    val we = w.exercises.getOrNull(ei) ?: return w to 0
    val s = we.sets.getOrNull(si) ?: return w to 0
    val done = !s.done
    val p = if (done) alignPrevious(we.sets, prev).getOrNull(si) else null
    val ns = if (!done) s.copy(done = false) else s.copy(
        done = true,
        weight = weight ?: s.weight ?: p?.weight,
        reps = reps ?: s.reps ?: p?.reps,
        durationSec = durationSec ?: s.durationSec ?: p?.durationSec,
    )
    val exercises = w.exercises.toMutableList()
    exercises[ei] = we.copy(sets = we.sets.toMutableList().also { it[si] = ns })
    if (!done) return w.copy(exercises = exercises) to 0
    // En superseries el descanso empieza tras el último ejercicio del bloque que aún tenga series pendientes.
    var chained = false
    var j = ei + 1
    while (we.supersetId != null && exercises.getOrNull(j)?.supersetId == we.supersetId) {
        if (exercises[j].sets.any { !it.done }) chained = true
        j++
    }
    return w.copy(exercises = exercises) to if (chained) 0 else (we.restSec ?: defaultRest)
}

/** Siguiente serie pendiente. En superseries alterna entre ejercicios del bloque (A1, B1, A2, B2…). */
fun nextPendingSet(w: LWorkout): Cursor? {
    val ex = w.exercises
    for (ei in ex.indices) {
        val si = ex[ei].sets.indexOfFirst { !it.done }
        if (si < 0) continue
        val ss = ex[ei].supersetId ?: return Cursor(ei, si)
        var start = ei
        while (start > 0 && ex[start - 1].supersetId == ss) start--
        var end = ei
        while (end + 1 < ex.size && ex[end + 1].supersetId == ss) end++
        var best: Cursor? = null
        var bestDone = Int.MAX_VALUE
        for (j in start..end) {
            val sj = ex[j].sets.indexOfFirst { !it.done }
            if (sj < 0) continue
            val d = ex[j].sets.count { it.done }
            if (d < bestDone) {
                best = Cursor(j, sj)
                bestDone = d
            }
        }
        return best ?: Cursor(ei, si)
    }
    return null
}

/** Solo series hechas y ejercicios con alguna. null si no queda nada. */
fun finishWorkout(w: LWorkout, endedAt: Long): LWorkout? {
    val ex = w.exercises.map { it.copy(sets = it.sets.filter { s -> s.done }) }.filter { it.sets.isNotEmpty() }
    return if (ex.isEmpty()) null else w.copy(exercises = ex, endedAt = endedAt, restEnd = null, restTotal = 0)
}

fun summarize(w: LWorkout, lib: Library?): Recent {
    var sets = 0
    var vol = 0.0
    for (e in w.exercises) for (s in e.sets) if (s.done && s.type != "warmup") {
        sets++
        // En los asistidos el peso es ayuda, no carga.
        if (lib?.byId?.get(e.exerciseId)?.kind != "assisted") vol += (s.weight ?: 0.0) * (s.reps ?: 0)
    }
    return Recent(w.id, w.name, w.startedAt, w.endedAt, sets, Math.round(vol).toDouble())
}

/** Vista de pantalla (la misma que llega del móvil) a partir del entreno local. */
fun LWorkout.toActive(lib: Library?): Active {
    val all = exercises.flatMap { it.sets }
    return Active(
        id = id,
        name = name,
        startedAt = startedAt,
        restEnd = restEnd,
        restTotal = restTotal,
        cursor = nextPendingSet(this),
        setsDone = all.count { it.done },
        setsTotal = all.size,
        exercises = exercises.map { we ->
            val ex = lib?.byId?.get(we.exerciseId)
            val prev = alignPrevious(we.sets, lib?.prev?.get(we.exerciseId).orEmpty())
            WExercise(
                name = ex?.name ?: we.exerciseId,
                kind = ex?.kind?.takeIf { it in KINDS } ?: "weight_reps",
                superset = we.supersetId != null,
                sets = we.sets.mapIndexed { i, s -> WSet(s.type, s.weight, s.reps, s.durationSec, s.done, prev[i]?.weight, prev[i]?.reps) },
            )
        },
    )
}

// ---- JSON ----

private fun JSONObject.dbl(k: String): Double? = if (has(k) && !isNull(k)) optDouble(k) else null
private fun JSONObject.int(k: String): Int? = if (has(k) && !isNull(k)) optInt(k) else null
private fun JSONObject.str(k: String): String? = if (has(k) && !isNull(k)) optString(k) else null
private fun JSONArray.objs(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
private fun iso(ms: Long) = Instant.ofEpochMilli(ms).toString()

private fun libSet(o: JSONObject) = LSet(o.optString("t", "normal"), o.dbl("w"), o.int("r"), o.int("d"))

fun parseLibrary(json: String): Library? = runCatching {
    val o = JSONObject(json)
    val prev = o.optJSONObject("prev")
    Library(
        sentAt = o.optLong("sentAt"),
        unit = if (o.optString("unit") == "lb") "lb" else "kg",
        defaultRest = o.optInt("defaultRest", 90),
        exercises = o.optJSONArray("exercises")?.objs().orEmpty().map { LibExercise(it.getString("id"), it.getString("name"), it.optString("kind", "weight_reps")) },
        routines = o.optJSONArray("routines")?.objs().orEmpty().map { r ->
            LibRoutine(r.getString("id"), r.getString("name"), r.str("folder"), r.getJSONArray("exercises").objs().map { e ->
                LExercise(e.getString("id"), e.int("rest"), e.str("ss"), e.getJSONArray("sets").objs().map(::libSet))
            })
        },
        prev = prev?.keys()?.asSequence()?.associateWith { k -> prev.getJSONArray(k).objs().map(::libSet) }.orEmpty(),
        recent = o.optJSONArray("recent")?.objs().orEmpty().map(::parseRecent),
    )
}.getOrNull()

private fun parseRecent(r: JSONObject) = Recent(r.getString("id"), r.getString("name"), r.getLong("start"), if (r.has("end")) r.optLong("end") else null, r.optInt("sets"), r.optDouble("volume", 0.0))

private fun Recent.toJson() = JSONObject().put("id", id).put("name", name).put("start", start).put("sets", sets).put("volume", volume).apply { end?.let { put("end", it) } }

/**
 * Entreno con la forma exacta de Workout. Con [local] añade lo que solo vive en el reloj (descanso y muestras
 * de pulso en bruto); sin él, el resumen de pulso que guarda la app.
 */
fun LWorkout.toJson(local: Boolean): JSONObject = JSONObject().apply {
    put("id", id)
    put("name", name)
    put("startedAt", iso(startedAt))
    endedAt?.let { put("endedAt", iso(it)) }
    routineId?.let { put("routineId", it) }
    put("exercises", JSONArray(exercises.map { e ->
        JSONObject().apply {
            put("exerciseId", e.exerciseId)
            e.restSec?.let { put("restSec", it) }
            e.supersetId?.let { put("supersetId", it) }
            put("sets", JSONArray(e.sets.map { s ->
                JSONObject().apply {
                    put("type", s.type)
                    s.weight?.let { put("weight", it) }
                    s.reps?.let { put("reps", it) }
                    s.durationSec?.let { put("durationSec", it) }
                    put("done", s.done)
                }
            }))
        }
    }))
    if (local) {
        restEnd?.let { put("restEnd", it) }
        put("restTotal", restTotal)
        put("hr", JSONArray(hr.map { JSONArray().put(it.first).put(it.second) }))
    } else heartRateSummary(hr)?.let { put("heartRate", it) }
}

// Como summarizeHeartRate (shared/session.ts): descarta lecturas imposibles y deja como mucho ~360 puntos.
private fun heartRateSummary(samples: List<Pair<Int, Int>>): JSONObject? {
    val ok = samples.filter { it.first >= 0 && it.second in 30..240 }
    if (ok.size < 2) return null
    val bpms = ok.map { it.second }
    val step = maxOf(1, ceil(ok.size / 360.0).toInt())
    return JSONObject()
        .put("avg", Math.round(bpms.average()).toInt())
        .put("max", bpms.max())
        .put("min", bpms.min())
        .put("samples", JSONArray(ok.filterIndexed { i, _ -> i % step == 0 }.map { JSONArray().put(it.first).put(it.second) }))
}

fun parseLocalWorkout(json: String): LWorkout? = runCatching {
    val o = JSONObject(json)
    LWorkout(
        id = o.getString("id"),
        name = o.getString("name"),
        startedAt = Instant.parse(o.getString("startedAt")).toEpochMilli(),
        routineId = o.str("routineId"),
        exercises = o.getJSONArray("exercises").objs().map { e ->
            LExercise(e.getString("exerciseId"), e.int("restSec"), e.str("supersetId"), e.getJSONArray("sets").objs().map { s ->
                LSet(s.optString("type", "normal"), s.dbl("weight"), s.int("reps"), s.int("durationSec"), s.optBoolean("done"))
            })
        },
        restEnd = if (o.has("restEnd")) o.optLong("restEnd") else null,
        restTotal = o.optInt("restTotal"),
        hr = o.optJSONArray("hr")?.let { a -> (0 until a.length()).map { a.getJSONArray(it).let { p -> p.getInt(0) to p.getInt(1) } } }.orEmpty(),
    )
}.getOrNull()

/**
 * Entreno local en curso y entrenos terminados que el móvil aún no ha confirmado. Se guarda todo en
 * SharedPreferences en cada cambio para sobrevivir a que se cierre la app o se reinicie el reloj.
 */
object LocalStore {
    const val PATH_WORKOUT = "/workstation/workout/"
    private lateinit var app: Context
    private var prefs: SharedPreferences? = null

    private val _session = MutableStateFlow<LWorkout?>(null)
    val session: StateFlow<LWorkout?> = _session
    private val _pending = MutableStateFlow<List<Recent>>(emptyList())
    val pending: StateFlow<List<Recent>> = _pending

    fun init(ctx: Context) {
        if (prefs != null) return
        app = ctx.applicationContext
        val p = app.getSharedPreferences("local_workout", Context.MODE_PRIVATE)
        prefs = p
        _session.value = p.getString("session", null)?.let(::parseLocalWorkout)
        _pending.value = p.getString("pending", null)?.let { runCatching { JSONArray(it).objs().map(::parseRecent) }.getOrNull() }.orEmpty()
    }

    private fun set(w: LWorkout?) {
        _session.value = w
        prefs?.edit()?.apply { if (w == null) remove("session") else putString("session", w.toJson(local = true).toString()) }?.apply()
    }

    private fun setPending(list: List<Recent>) {
        if (list == _pending.value) return
        _pending.value = list
        prefs?.edit()?.putString("pending", JSONArray(list.map { it.toJson() }).toString())?.apply()
    }

    private fun update(f: (LWorkout) -> LWorkout) {
        _session.value?.let { set(f(it)) }
    }

    fun start(name: String, routineId: String?, exercises: List<LExercise>) {
        set(LWorkout(UUID.randomUUID().toString(), name, System.currentTimeMillis(), routineId, exercises))
    }

    fun toggle(lib: Library?, ei: Int, si: Int, weight: Double? = null, reps: Int? = null, durationSec: Int? = null) = update { w ->
        val prev = lib?.prev?.get(w.exercises.getOrNull(ei)?.exerciseId).orEmpty()
        val (n, rest) = toggleSet(w, ei, si, prev, lib?.defaultRest ?: 90, weight, reps, durationSec)
        if (rest > 0) n.copy(restEnd = System.currentTimeMillis() + rest * 1000L, restTotal = rest) else n
    }

    fun restAdd(sec: Int) = update { w ->
        val end = w.restEnd ?: return@update w
        w.copy(restEnd = maxOf(System.currentTimeMillis(), end + sec * 1000L), restTotal = maxOf(1, w.restTotal + sec))
    }

    fun restSkip() = update { it.copy(restEnd = null, restTotal = 0) }

    fun addExercise(id: String, defaultRest: Int) = update { w ->
        w.copy(exercises = w.exercises + LExercise(id, defaultRest, null, List(3) { LSet() }))
    }

    fun addHr(bpm: Int) = update { w -> w.copy(hr = w.hr + (((System.currentTimeMillis() - w.startedAt) / 1000).toInt() to bpm)) }

    fun discard() = set(null)

    /** Cierra el entreno y lo deja en el Data Layer, que lo entrega al móvil en cuanto esté al alcance. */
    fun finish(lib: Library?): Recent? {
        val w = finishWorkout(_session.value ?: return null, System.currentTimeMillis()) ?: return null
        val req = PutDataMapRequest.create(PATH_WORKOUT + w.id).apply { dataMap.putString(PhoneLink.KEY_JSON, w.toJson(local = false).toString()) }
        Wearable.getDataClient(app).putDataItem(req.asPutDataRequest().setUrgent())
        val r = summarize(w, lib)
        setPending(listOf(r) + _pending.value)
        set(null)
        return r
    }

    /** El móvil ya lo tiene: aparece en su historial o ha borrado el DataItem. */
    fun confirm(ids: Collection<String>) = setPending(_pending.value.filterNot { it.id in ids })

    fun keepOnly(ids: Set<String>) = setPending(_pending.value.filter { it.id in ids })

    fun workoutId(path: String?): String? = path?.takeIf { it.startsWith(PATH_WORKOUT) }?.removePrefix(PATH_WORKOUT)
}
