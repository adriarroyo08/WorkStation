package com.workstation.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.CompactButton
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Colors
import kotlinx.coroutines.delay
import org.json.JSONObject

private val Accent = Color(0xFFF2600C)
private val Surface = Color(0xFF1F1F1F)
private val TextMain = Color(0xFFF2F2F2)
private val TextDim = Color(0xFF8E8E93)
private val Danger = Color(0xFFFF4545)

@Composable
fun WatchApp(
    state: WatchState?,
    connected: Boolean,
    bpm: Int?,
    send: (JSONObject) -> Unit,
    vibrate: () -> Unit,
    keepScreenOn: (Boolean) -> Unit,
    onActiveChanged: () -> Unit,
) {
    MaterialTheme(colors = Colors(
        primary = Accent, primaryVariant = Accent, secondary = Accent, secondaryVariant = Accent,
        background = Color.Black, surface = Surface, error = Danger,
        onPrimary = Color.White, onSecondary = Color.White, onBackground = TextMain, onSurface = TextMain, onSurfaceVariant = TextDim,
    )) {
        val now = rememberNow()
        val active = state?.active
        LaunchedEffect(active?.id) { onActiveChanged() }
        Scaffold(timeText = { TimeText() }) {
            when {
                active == null -> IdleScreen(state, connected, send)
                active.restEnd != null && active.restEnd > now -> RestScreen(active, now, bpm, send, vibrate, keepScreenOn)
                else -> SetScreen(active, now, bpm, send)
            }
        }
    }
}

@Composable
private fun rememberNow(): Long {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(500)
        }
    }
    return now
}

@Composable
private fun IdleScreen(state: WatchState?, connected: Boolean, send: (JSONObject) -> Unit) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        item { Text("Workstation", fontWeight = FontWeight.Bold, color = TextMain, fontSize = 18.sp) }
        if (!connected) {
            item { Text("Sin conexión con el móvil", color = TextDim, textAlign = TextAlign.Center, fontSize = 13.sp) }
        }
        if (state == null) {
            item {
                Text(
                    "Abre Workstation en el móvil para sincronizar",
                    textAlign = TextAlign.Center,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(8.dp),
                )
            }
        } else {
            item {
                Chip(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { send(Cmd.startEmpty()) },
                    label = { Text("Entreno vacío") },
                    colors = ChipDefaults.primaryChipColors(),
                )
            }
            if (state.routines.isNotEmpty()) item { Text("Rutinas", fontSize = 12.sp, color = TextDim) }
            state.routines.forEach { r ->
                item {
                    Chip(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { send(Cmd.startRoutine(r.id)) },
                        label = { Text(r.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        secondaryLabel = { Text("${r.exercises} ejercicios") },
                        colors = ChipDefaults.secondaryChipColors(),
                    )
                }
            }
        }
    }
}

@Composable
private fun SetScreen(a: Active, now: Long, bpm: Int?, send: (JSONObject) -> Unit) {
    if (a.exercises.isEmpty()) {
        Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Text("Añade ejercicios en el móvil", textAlign = TextAlign.Center)
        }
        return
    }
    // Serie seleccionada: por defecto la siguiente pendiente; se puede navegar con los botones laterales.
    val flat = remember(a) { a.exercises.flatMapIndexed { ei, e -> e.sets.indices.map { si -> Cursor(ei, si) } } }
    var idx by remember(a.cursor, a.id) { mutableStateOf(a.cursor?.let { c -> flat.indexOf(c).coerceAtLeast(0) } ?: (flat.size - 1)) }
    val cur = flat.getOrNull(idx) ?: return
    val ex = a.exercises[cur.ei]
    val set = ex.sets[cur.si]
    var weight by remember(cur, set) { mutableStateOf(set.weight ?: set.prevWeight) }
    var reps by remember(cur, set) { mutableStateOf(set.reps ?: set.prevReps) }
    var secs by remember(cur, set) { mutableStateOf(set.durationSec) }
    val isTime = ex.kind == "duration" || ex.kind == "distance"
    val usesWeight = ex.kind == "weight_reps" || ex.kind == "reps" || ex.kind == "assisted"
    val workIndex = ex.sets.take(cur.si + 1).count { it.type != "warmup" }
    val typeLabel = when (set.type) {
        "warmup" -> "Calentamiento"
        "drop" -> "Drop set"
        "failure" -> "Al fallo"
        else -> "Serie $workIndex de ${ex.sets.count { it.type != "warmup" }}"
    }
    var confirmFinish by remember { mutableStateOf(false) }

    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        item {
            Text(
                ex.name,
                fontWeight = FontWeight.Bold,
                color = TextMain,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                fontSize = 15.sp,
            )
        }
        item {
            Text(
                (if (ex.superset) "Superserie · " else "") + typeLabel + if (set.done) " ✓" else "",
                fontSize = 12.sp,
                color = if (set.done) Accent else TextDim,
            )
        }
        if (usesWeight) {
            item {
                Stepper(
                    value = formatWeight(weight) + if (ex.kind == "assisted") " $weightUnit asist." else " $weightUnit",
                    onMinus = { weight = stepWeight(weight, -1) },
                    onPlus = { weight = stepWeight(weight, 1) },
                )
            }
        }
        item {
            if (isTime) Stepper(value = clock((secs ?: 0).toLong()), onMinus = { secs = ((secs ?: 0) - 5).coerceAtLeast(0) }, onPlus = { secs = (secs ?: 0) + 5 })
            else Stepper(value = "${reps ?: 0} reps", onMinus = { reps = ((reps ?: 0) - 1).coerceAtLeast(0) }, onPlus = { reps = (reps ?: 0) + 1 })
        }
        if (set.prevWeight != null || set.prevReps != null) {
            item { Text("Anterior: ${formatWeight(set.prevWeight)} × ${set.prevReps ?: "–"}", fontSize = 11.sp, color = TextDim) }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CompactButton(onClick = { if (idx > 0) idx-- }, enabled = idx > 0, colors = ButtonDefaults.secondaryButtonColors()) { Text("‹", fontSize = 20.sp) }
                Button(
                    modifier = Modifier.size(ButtonDefaults.LargeButtonSize),
                    colors = ButtonDefaults.buttonColors(backgroundColor = if (set.done) Surface else Accent, contentColor = Color.White),
                    onClick = {
                        if (set.done) send(Cmd.uncompleteSet(a.id, ex.name, cur.ei, cur.si))
                        else send(Cmd.completeSet(a.id, ex.name, cur.ei, cur.si, if (usesWeight) weight else null, if (isTime) null else reps, if (isTime) secs else null))
                    },
                ) { Text(if (set.done) "↺" else "✓", fontSize = 26.sp, fontWeight = FontWeight.Bold) }
                CompactButton(onClick = { if (idx < flat.size - 1) idx++ }, enabled = idx < flat.size - 1, colors = ButtonDefaults.secondaryButtonColors()) { Text("›", fontSize = 20.sp) }
            }
        }
        item {
            Text(
                clock((now - a.startedAt) / 1000) + "  ·  ${a.setsDone}/${a.setsTotal}" + (bpm?.let { "  ·  $it ppm" } ?: ""),
                fontSize = 12.sp,
                color = TextDim,
            )
        }
        item { Spacer(Modifier.height(4.dp)) }
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    if (confirmFinish) send(Cmd.finish()) else confirmFinish = true
                },
                label = { Text(if (confirmFinish) "Toca otra vez para guardar" else "Terminar entreno") },
                colors = ChipDefaults.chipColors(backgroundColor = if (confirmFinish) Danger else Surface, contentColor = if (confirmFinish) Color.White else TextMain),
            )
        }
    }
}

@Composable
private fun Stepper(value: String, onMinus: () -> Unit, onPlus: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        CompactButton(onClick = onMinus, colors = ButtonDefaults.secondaryButtonColors()) { Text("−", fontSize = 18.sp) }
        Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.width(92.dp))
        CompactButton(onClick = onPlus, colors = ButtonDefaults.secondaryButtonColors()) { Text("+", fontSize = 18.sp) }
    }
}

@Composable
private fun RestScreen(a: Active, now: Long, bpm: Int?, send: (JSONObject) -> Unit, vibrate: () -> Unit, keepScreenOn: (Boolean) -> Unit) {
    val end = a.restEnd ?: return
    val left = ((end - now) / 1000).coerceAtLeast(0)
    val total = a.restTotal.coerceAtLeast(1)
    DisposableEffect(Unit) {
        keepScreenOn(true)
        onDispose { keepScreenOn(false) }
    }
    // Vibra justo al terminar (si la pantalla sigue en esta vista).
    LaunchedEffect(end) {
        val wait = end - System.currentTimeMillis()
        if (wait > 0) {
            delay(wait)
            vibrate()
        }
    }
    val next = a.cursor?.let { c -> a.exercises.getOrNull(c.ei)?.let { e -> e to e.sets.getOrNull(c.si) } }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(
            progress = left.toFloat() / total,
            modifier = Modifier.fillMaxSize().padding(2.dp),
            strokeWidth = 6.dp,
            indicatorColor = Accent,
            trackColor = Surface,
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
            Text("Descanso", fontSize = 12.sp, color = TextDim)
            Text(clock(left), fontSize = 40.sp, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                CompactButton(onClick = { send(Cmd.restAdd(-15)) }, colors = ButtonDefaults.secondaryButtonColors()) { Text("-15") }
                CompactButton(onClick = { send(Cmd.restAdd(15)) }, colors = ButtonDefaults.secondaryButtonColors()) { Text("+15") }
                CompactButton(onClick = { send(Cmd.restSkip()) }) { Text("»") }
            }
            if (next != null) {
                val (e, s) = next
                Text(
                    "Siguiente: ${e.name}" + (s?.let { " · ${formatWeight(it.weight ?: it.prevWeight)}×${it.reps ?: it.prevReps ?: "–"}" } ?: ""),
                    fontSize = 11.sp,
                    color = TextDim,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            bpm?.let { Text("$it ppm", fontSize = 12.sp, color = TextDim) }
        }
    }
}
