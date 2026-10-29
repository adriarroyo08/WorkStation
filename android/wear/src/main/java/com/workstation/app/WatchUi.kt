package com.workstation.app

import androidx.activity.compose.BackHandler
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
import androidx.wear.compose.foundation.lazy.ScalingLazyListState
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Card
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.CompactButton
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.SwipeToDismissBox
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Colors
import kotlinx.coroutines.delay
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val Accent = Color(0xFFF2600C)
private val Surface = Color(0xFF1F1F1F)
private val TextMain = Color(0xFFF2F2F2)
private val TextDim = Color(0xFF8E8E93)
private val Danger = Color(0xFFFF4545)

/** Acciones de las pantallas de serie y descanso: comandos al móvil (remoto) o cambios en el entreno local. */
class SetActions(
    val complete: (ei: Int, si: Int, weight: Double?, reps: Int?, secs: Int?) -> Unit,
    val uncomplete: (ei: Int, si: Int) -> Unit,
    val restAdd: (Int) -> Unit,
    val restSkip: () -> Unit,
    val finish: (() -> Unit)?,
    val menu: (() -> Unit)? = null,
)

private fun remoteActions(a: Active, send: (JSONObject) -> Unit) = SetActions(
    complete = { ei, si, w, r, s -> send(Cmd.completeSet(a.id, a.exercises[ei].name, ei, si, w, r, s)) },
    uncomplete = { ei, si -> send(Cmd.uncompleteSet(a.id, a.exercises[ei].name, ei, si)) },
    restAdd = { send(Cmd.restAdd(it)) },
    restSkip = { send(Cmd.restSkip()) },
    finish = { send(Cmd.finish()) },
)

@Composable
fun WatchApp(
    state: WatchState?,
    library: Library?,
    local: LWorkout?,
    pending: List<Recent>,
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
        LaunchedEffect(active?.id, local?.id) { onActiveChanged() }
        // Subpantalla abierta: "routine", "history", "menu" (ejercicios del entreno local) o "pick" (añadir ejercicio).
        var page by remember { mutableStateOf("") }
        var routine by remember { mutableStateOf<LibRoutine?>(null) }
        var focus by remember { mutableStateOf<Cursor?>(null) }
        var summary by remember { mutableStateOf<Recent?>(null) }
        // Un entreno empezado en el móvil manda: el reloj hace de mando, como siempre.
        val la = remember(local, library) { local?.toActive(library) }
        val shown = active ?: la
        val resting = shown?.restEnd != null && shown.restEnd > now
        val screen = when {
            active != null -> if (resting) "rest" else "set"
            la != null -> when {
                page == "menu" || page == "pick" -> page
                la.exercises.isEmpty() -> "empty"
                resting -> "rest"
                else -> "set"
            }
            summary != null -> "summary"
            page == "routine" && routine != null -> page
            page == "history" -> page
            else -> "home"
        }
        val actions = when {
            active != null -> remoteActions(active, send)
            la != null -> SetActions(
                complete = { ei, si, w, r, s ->
                    focus = null
                    LocalStore.toggle(library, ei, si, w, r, s)
                },
                uncomplete = { ei, si -> LocalStore.toggle(library, ei, si) },
                restAdd = LocalStore::restAdd,
                restSkip = LocalStore::restSkip,
                finish = if (la.setsDone > 0) ({
                    summary = LocalStore.finish(library)
                    page = ""
                }) else null,
                menu = { page = "menu" },
            )
            else -> null
        }
        val startLocal: (String, String?, List<LExercise>) -> Unit = { name, id, ex ->
            LocalStore.start(name, id, ex)
            focus = null
            page = ""
        }
        // Una lista por pantalla, y la hora se oculta al hacer scroll para no tapar los botones de arriba.
        val list = remember(screen) { ScalingLazyListState() }
        Scaffold(timeText = { if (list.centerItemIndex <= 1) TimeText() }) {
            when (screen) {
                "home" -> HomeScreen(
                    state, library, connected, list,
                    onEmpty = { startLocal("Entrenamiento", null, emptyList()) },
                    onRoutine = {
                        routine = it
                        page = "routine"
                    },
                    onHistory = { page = "history" },
                )
                "routine" -> Sub({ page = "" }) { RoutineScreen(routine!!, library, list) { r -> startLocal(r.name, r.id, r.exercises) } }
                "history" -> Sub({ page = "" }) { HistoryScreen(library, pending, list) }
                "summary" -> SummaryScreen(summary!!, list) { summary = null }
                "menu", "empty" -> {
                    val content = @Composable {
                        ExercisesScreen(
                            la!!, now, list,
                            onJump = { ei ->
                                focus = Cursor(ei, la.exercises[ei].sets.indexOfFirst { !it.done }.coerceAtLeast(0))
                                page = ""
                            },
                            onAdd = { page = "pick" },
                            onFinish = actions?.finish,
                            onDiscard = {
                                LocalStore.discard()
                                page = ""
                            },
                        )
                    }
                    if (screen == "menu") Sub({ page = "" }, content) else content()
                }
                "pick" -> Sub({ page = "menu" }) {
                    PickerScreen(library, list) { id ->
                        focus = Cursor(la!!.exercises.size, 0)
                        LocalStore.addExercise(id, library?.defaultRest ?: 90)
                        page = ""
                    }
                }
                // Con el servicio en marcha es él quien vibra al acabar el descanso local (aunque la pantalla esté apagada).
                "rest" -> RestScreen(shown!!, now, bpm, actions!!, if (active == null) ({ if (!HeartRateService.running) vibrate() }) else vibrate, keepScreenOn)
                else -> SetScreen(shown!!, now, bpm, actions!!, if (active == null) focus else null, list)
            }
        }
    }
}

/** Subpantalla que se cierra deslizando hacia la derecha (o con el botón atrás). */
@Composable
private fun Sub(onBack: () -> Unit, content: @Composable () -> Unit) {
    BackHandler(onBack = onBack)
    SwipeToDismissBox(onDismissed = onBack) { isBackground -> if (!isBackground) content() }
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
private fun Title(text: String) {
    Text(text, fontWeight = FontWeight.Bold, color = TextMain, fontSize = 16.sp, textAlign = TextAlign.Center, maxLines = 2, overflow = TextOverflow.Ellipsis)
}

@Composable
private fun Label(text: String) {
    Text(text, fontSize = 12.sp, color = TextDim, textAlign = TextAlign.Center)
}

@Composable
private fun HomeScreen(
    state: WatchState?,
    library: Library?,
    connected: Boolean,
    list: ScalingLazyListState,
    onEmpty: () -> Unit,
    onRoutine: (LibRoutine) -> Unit,
    onHistory: () -> Unit,
) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
        item { Text("Workstation", fontWeight = FontWeight.Bold, color = TextMain, fontSize = 18.sp) }
        if (library == null) {
            if (!connected && state == null) item { Label("Sin conexión con el móvil") }
            item {
                Text(
                    "Abre Workstation en el móvil una vez para traer tus rutinas",
                    textAlign = TextAlign.Center,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(8.dp),
                )
            }
            return@ScalingLazyColumn
        }
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = onEmpty,
                label = { Text("Entreno vacío") },
                colors = ChipDefaults.primaryChipColors(),
            )
        }
        library.routines.groupBy { it.folder }.forEach { (folder, routines) ->
            item { Label(folder ?: "Rutinas") }
            routines.forEach { r ->
                item {
                    Chip(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { onRoutine(r) },
                        label = { Text(r.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        secondaryLabel = { Text("${r.exercises.size} ejercicios") },
                        colors = ChipDefaults.secondaryChipColors(),
                    )
                }
            }
        }
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = onHistory,
                label = { Text("Historial") },
                colors = ChipDefaults.secondaryChipColors(),
            )
        }
    }
}

@Composable
private fun RoutineScreen(r: LibRoutine, library: Library?, list: ScalingLazyListState, onStart: (LibRoutine) -> Unit) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
        item { Title(r.name) }
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = { onStart(r) },
                label = { Text("Empezar") },
                colors = ChipDefaults.primaryChipColors(),
            )
        }
        r.exercises.forEach { e ->
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(library?.byId?.get(e.exerciseId)?.name ?: e.exerciseId, fontSize = 14.sp, textAlign = TextAlign.Center, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Label((if (e.supersetId != null) "Superserie · " else "") + "${e.sets.size} series")
                }
            }
        }
    }
}

private val dayFormat = SimpleDateFormat("d MMM", Locale.forLanguageTag("es"))

@Composable
private fun HistoryScreen(library: Library?, pending: List<Recent>, list: ScalingLazyListState) {
    val recent = library?.recent.orEmpty()
    val all = (pending.filter { p -> recent.none { it.id == p.id } } + recent).sortedByDescending { it.start }
    val unsent = pending.map { it.id }.toSet()
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
        item { Title("Historial") }
        if (all.isEmpty()) item { Label("Aún no hay entrenos") }
        all.forEach { r ->
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text(r.name, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Label(dayFormat.format(Date(r.start)) + (r.end?.let { " · ${(it - r.start) / 60000} min" } ?: ""))
                    Label("${r.sets} series · ${formatWeight(r.volume)} $weightUnit" + if (r.id in unsent) " · sin enviar" else "")
                }
            }
        }
    }
}

@Composable
private fun SummaryScreen(r: Recent, list: ScalingLazyListState, onDone: () -> Unit) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
        item { Label("Entreno terminado") }
        item { Title(r.name) }
        item { Text("Duración  " + clock(((r.end ?: r.start) - r.start) / 1000), fontSize = 14.sp) }
        item { Text("Series  ${r.sets}", fontSize = 14.sp) }
        item { Text("Volumen  ${formatWeight(r.volume)} $weightUnit", fontSize = 14.sp) }
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = onDone,
                label = { Text("Listo") },
                colors = ChipDefaults.primaryChipColors(),
            )
        }
    }
}

@Composable
private fun ExercisesScreen(
    a: Active,
    now: Long,
    list: ScalingLazyListState,
    onJump: (Int) -> Unit,
    onAdd: () -> Unit,
    onFinish: (() -> Unit)?,
    onDiscard: () -> Unit,
) {
    var confirmFinish by remember { mutableStateOf(false) }
    var confirmDiscard by remember { mutableStateOf(false) }
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
        item { Title(a.name) }
        item { Label(clock((now - a.startedAt) / 1000) + "  ·  ${a.setsDone}/${a.setsTotal}") }
        a.exercises.forEachIndexed { ei, e ->
            item {
                Chip(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { onJump(ei) },
                    label = { Text(e.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    secondaryLabel = { Text((if (e.superset) "Superserie · " else "") + "${e.sets.count { it.done }}/${e.sets.size} series") },
                    colors = ChipDefaults.secondaryChipColors(),
                )
            }
        }
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = onAdd,
                label = { Text("Añadir ejercicio") },
                colors = ChipDefaults.primaryChipColors(),
            )
        }
        if (onFinish != null) item { ConfirmChip(confirmFinish, "Terminar entreno", "Toca otra vez para guardar") { if (confirmFinish) onFinish() else confirmFinish = true } }
        item { ConfirmChip(confirmDiscard, "Descartar", "Toca otra vez para descartar") { if (confirmDiscard) onDiscard() else confirmDiscard = true } }
    }
}

@Composable
private fun ConfirmChip(confirm: Boolean, label: String, confirmLabel: String, onClick: () -> Unit) {
    Chip(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        label = { Text(if (confirm) confirmLabel else label) },
        colors = ChipDefaults.chipColors(backgroundColor = if (confirm) Danger else Surface, contentColor = if (confirm) Color.White else TextMain),
    )
}

@Composable
private fun PickerScreen(library: Library?, list: ScalingLazyListState, onPick: (String) -> Unit) {
    val exercises = remember(library) { library?.exercises.orEmpty().sortedBy { it.name.lowercase() } }
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
        item { Title("Añadir ejercicio") }
        if (exercises.isEmpty()) item { Label("Abre Workstation en el móvil para traer tus ejercicios") }
        exercises.forEach { e ->
            item {
                Chip(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { onPick(e.id) },
                    label = { Text(e.name, maxLines = 2, overflow = TextOverflow.Ellipsis) },
                    colors = ChipDefaults.secondaryChipColors(),
                )
            }
        }
    }
}

@Composable
private fun SetScreen(a: Active, now: Long, bpm: Int?, actions: SetActions, focus: Cursor?, list: ScalingLazyListState) {
    if (a.exercises.isEmpty()) {
        Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Text("Añade ejercicios en el móvil", textAlign = TextAlign.Center)
        }
        return
    }
    // Serie seleccionada: por defecto la siguiente pendiente (o la elegida en la lista de ejercicios); se puede
    // navegar con los botones laterales.
    val flat = remember(a) { a.exercises.flatMapIndexed { ei, e -> e.sets.indices.map { si -> Cursor(ei, si) } } }
    var idx by remember(a.cursor, a.id, focus) { mutableStateOf((focus ?: a.cursor)?.let { c -> flat.indexOf(c).coerceAtLeast(0) } ?: (flat.size - 1)) }
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

    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
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
                color = TextDim,
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
                        if (set.done) actions.uncomplete(cur.ei, cur.si)
                        else actions.complete(cur.ei, cur.si, if (usesWeight) weight else null, if (isTime) null else reps, if (isTime) secs else null)
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
        actions.menu?.let { menu ->
            item {
                Chip(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = menu,
                    label = { Text("Ejercicios") },
                    colors = ChipDefaults.secondaryChipColors(),
                )
            }
        }
        actions.finish?.let { finish ->
            item { ConfirmChip(confirmFinish, "Terminar entreno", "Toca otra vez para guardar") { if (confirmFinish) finish() else confirmFinish = true } }
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
private fun RestScreen(a: Active, now: Long, bpm: Int?, actions: SetActions, vibrate: () -> Unit, keepScreenOn: (Boolean) -> Unit) {
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
                CompactButton(onClick = { actions.restAdd(-15) }, colors = ButtonDefaults.secondaryButtonColors()) { Text("-15") }
                CompactButton(onClick = { actions.restAdd(15) }, colors = ButtonDefaults.secondaryButtonColors()) { Text("+15") }
                CompactButton(onClick = { actions.restSkip() }) { Text("»") }
            }
            if (next != null) {
                val (e, s) = next
                Text("Siguiente: ${e.name}", fontSize = 11.sp, color = TextDim, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis)
                s?.let { Text("${formatWeight(it.weight ?: it.prevWeight)} × ${it.reps ?: it.prevReps ?: "–"}", fontSize = 11.sp, color = TextDim) }
            }
            bpm?.let { Text("$it ppm", fontSize = 12.sp, color = TextDim) }
        }
    }
}
