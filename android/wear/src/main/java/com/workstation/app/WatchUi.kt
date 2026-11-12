package com.workstation.app

import android.app.RemoteInput
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.ScalingLazyListState
import androidx.wear.compose.material.Card
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.SwipeToDismissBox
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Colors
import androidx.wear.input.RemoteInputIntentHelper
import androidx.wear.input.WearableRemoteInputExtender
import kotlinx.coroutines.delay
import org.json.JSONObject
import java.text.Normalizer
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min

private val Accent = Color(0xFFF2600C)
private val Surface = Color(0xFF1F1F1F)
private val TextMain = Color(0xFFF2F2F2)
private val TextDim = Color(0xFF8E8E93)
private val Danger = Color(0xFFFF4545)
private val Track = Color(0xFF3A3A3A)

// Píxeles de corona por paso: a menos, un giro leve cambiaría el valor varias veces.
private const val ROTARY_STEP = 40f

private fun icon(name: String, path: String): ImageVector =
    ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).addPath(addPathNodes(path), fill = SolidColor(Color.White)).build()

private val IconCheck = icon("check", "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
private val IconUndo = icon("undo", "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z")
private val IconPrev = icon("prev", "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z")
private val IconNext = icon("next", "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z")
private val IconSkip = icon("skip", "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z")
private val IconMenu = icon("menu", "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z")
private val IconPlus = icon("plus", "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z")
private val IconMinus = icon("minus", "M19 13H5v-2h14v2z")
private val IconSearch = icon("search", "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z")

/** Acciones de las pantallas de serie y descanso: comandos al móvil (remoto) o cambios en el entreno local. */
class SetActions(
    val complete: (ei: Int, si: Int, weight: Double?, reps: Int?, secs: Int?) -> Unit,
    val uncomplete: (ei: Int, si: Int) -> Unit,
    val restAdd: (Int) -> Unit,
    val restSkip: () -> Unit,
    val finish: (() -> Unit)?,
    val menu: (() -> Unit)? = null,
)

private fun remoteActions(a: Active, send: (JSONObject) -> Unit, onComplete: () -> Unit, onMenu: () -> Unit) = SetActions(
    complete = { ei, si, w, r, s ->
        onComplete()
        send(Cmd.completeSet(a.id, a.exercises[ei].name, ei, si, w, r, s))
    },
    uncomplete = { ei, si -> send(Cmd.uncompleteSet(a.id, a.exercises[ei].name, ei, si)) },
    restAdd = { send(Cmd.restAdd(it)) },
    restSkip = { send(Cmd.restSkip()) },
    finish = { send(Cmd.finish()) },
    menu = onMenu,
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
        // Subpantalla abierta: "routine", "history", "menu" (ejercicios del entreno en curso) o "pick" (añadir ejercicio).
        var page by remember { mutableStateOf("") }
        LaunchedEffect(active?.id, local?.id) {
            onActiveChanged()
            page = ""
        }
        var routine by remember { mutableStateOf<LibRoutine?>(null) }
        var focus by remember { mutableStateOf<Cursor?>(null) }
        var summary by remember { mutableStateOf<Recent?>(null) }
        // Un entreno empezado en el móvil manda: el reloj hace de mando, como siempre.
        val la = remember(local, library) { local?.toActive(library) }
        val shown = active ?: la
        val resting = shown?.restEnd != null && shown.restEnd > now
        val screen = when {
            active != null -> when {
                page == "menu" || page == "pick" -> page
                active.exercises.isEmpty() -> "empty"
                resting -> "rest"
                else -> "set"
            }
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
            active != null -> remoteActions(active, send, onComplete = { focus = null }, onMenu = { page = "menu" })
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
        // En la serie y el descanso manda el tiempo del entreno: no hay hora que tape nada.
        val list = remember(screen) { ScalingLazyListState() }
        Scaffold(timeText = { if (screen != "set" && screen != "rest" && list.centerItemIndex <= 1) TimeText() }) {
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
                        val a = shown!!
                        ExercisesScreen(
                            a, now, list,
                            onJump = { ei ->
                                focus = Cursor(ei, a.exercises[ei].sets.indexOfFirst { !it.done }.coerceAtLeast(0))
                                page = ""
                            },
                            library = library,
                            // Un entreno que sigue el móvil solo se descarta desde el móvil; añadir sí (lo aplica el móvil).
                            onAdd = if (library?.exercises.isNullOrEmpty()) null else ({ page = "pick" }),
                            onFinish = actions?.finish,
                            onDiscard = if (active == null) ({
                                LocalStore.discard()
                                page = ""
                            }) else null,
                        )
                    }
                    if (screen == "menu") Sub({ page = "" }, content) else content()
                }
                "pick" -> Sub({ page = "menu" }) {
                    PickerScreen(library, list) { id ->
                        focus = Cursor(shown!!.exercises.size, 0)
                        if (active != null) send(Cmd.addExercise(active.id, id))
                        else LocalStore.addExercise(id, library?.defaultRest ?: 90)
                        page = ""
                    }
                }
                // Con el servicio en marcha es él quien vibra al acabar el descanso local (aunque la pantalla esté apagada).
                "rest" -> FitToScreen { RestScreen(shown!!, now, bpm, actions!!, if (active == null) ({ if (!HeartRateService.running) vibrate() }) else vibrate, keepScreenOn) }
                else -> FitToScreen { SetScreen(shown!!, now, bpm, actions!!, focus) }
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

/** Escala las pantallas de tamaño fijo al reloj: 227 dp es la referencia (TicWatch), y cabe igual en uno de 192. */
@Composable
private fun FitToScreen(content: @Composable () -> Unit) {
    val density = LocalDensity.current
    val factor = (LocalConfiguration.current.screenWidthDp / 227f).coerceIn(0.8f, 1.2f)
    CompositionLocalProvider(LocalDensity provides Density(density.density * factor, min(density.fontScale, 1.1f)), content = content)
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
                        icon = routineIcon(r, library),
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
                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MuscleThumb(musclesOf(library, e.exerciseId))
                    Column(Modifier.weight(1f)) {
                        Text(library?.byId?.get(e.exerciseId)?.name ?: e.exerciseId, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Text((if (e.supersetId != null) "Superserie · " else "") + "${e.sets.size} series", fontSize = 12.sp, color = TextDim)
                    }
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
        item { Text(clock(((r.end ?: r.start) - r.start) / 1000), fontSize = 40.sp, fontWeight = FontWeight.Bold, color = Accent) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                Stat("${r.sets}", "series")
                Stat(formatWeight(r.volume), weightUnit)
            }
        }
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
private fun Stat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Label(label)
    }
}

@Composable
private fun ExercisesScreen(
    a: Active,
    now: Long,
    list: ScalingLazyListState,
    library: Library?,
    onJump: (Int) -> Unit,
    onAdd: (() -> Unit)?,
    onFinish: (() -> Unit)?,
    onDiscard: (() -> Unit)?,
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
                    secondaryLabel = {
                        val finished = e.sets.isNotEmpty() && e.sets.all { it.done }
                        val progress = if (finished) "Terminado" else "${e.sets.count { it.done }}/${e.sets.size} series"
                        Text((if (e.superset) "Superserie · " else "") + progress, color = if (finished) Accent else TextDim)
                    },
                    icon = exerciseIcon(musclesOf(library, e.id)),
                    colors = ChipDefaults.secondaryChipColors(),
                )
            }
        }
        if (onAdd != null) item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = onAdd,
                label = { Text("Añadir ejercicio") },
                colors = ChipDefaults.secondaryChipColors(),
            )
        }
        if (onFinish != null) item { ConfirmChip(confirmFinish, "Terminar entreno", "Toca otra vez para guardar") { if (confirmFinish) onFinish() else confirmFinish = true } }
        if (onDiscard != null) item { ConfirmChip(confirmDiscard, "Descartar", "Toca otra vez para descartar") { if (confirmDiscard) onDiscard() else confirmDiscard = true } }
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

/** Quita mayúsculas y tildes: «press bánca» encuentra «Press de banca». */
private fun fold(t: String) = Normalizer.normalize(t.lowercase(), Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "")

/** Todas las palabras buscadas aparecen en el nombre, en cualquier orden. */
fun matchesQuery(name: String, query: String): Boolean {
    val n = fold(name)
    return fold(query).split(' ').filter { it.isNotBlank() }.all { it in n }
}

@Composable
private fun PickerScreen(library: Library?, list: ScalingLazyListState, onPick: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    // Teclado o dictado del sistema, lo que el usuario tenga configurado en el reloj.
    val search = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        res.data?.let { RemoteInput.getResultsFromIntent(it)?.getCharSequence(SEARCH_KEY)?.toString() }?.let { query = it.trim() }
    }
    val openSearch: () -> Unit = {
        val input = WearableRemoteInputExtender(RemoteInput.Builder(SEARCH_KEY).setLabel("Buscar ejercicio")).setEmojisAllowed(false).get().build()
        val intent = RemoteInputIntentHelper.createActionRemoteInputIntent()
        RemoteInputIntentHelper.putRemoteInputsExtra(intent, listOf(input))
        runCatching { search.launch(intent) }
    }
    val all = remember(library) { library?.exercises.orEmpty().sortedBy { it.name.lowercase() } }
    // Sin búsqueda van primero los que has hecho últimamente: lo más probable al añadir a mitad de sesión.
    val recent = remember(library) { library?.prev?.keys.orEmpty() }
    val shown = remember(all, query) {
        if (query.isBlank()) all.filter { it.id in recent } + all.filter { it.id !in recent }
        else all.filter { matchesQuery(it.name, query) }
    }
    LaunchedEffect(query) { list.scrollToItem(0) }
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(), state = list, horizontalAlignment = Alignment.CenterHorizontally) {
        item { Title("Añadir ejercicio") }
        if (all.isEmpty()) {
            item { Label("Abre Workstation en el móvil para traer tus ejercicios") }
            return@ScalingLazyColumn
        }
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = openSearch,
                label = { Text(if (query.isBlank()) "Buscar" else "«$query»", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                secondaryLabel = { Text(if (query.isBlank()) "Teclado o voz" else "${shown.size} resultados · cambiar") },
                icon = { Icon(IconSearch, null) },
                colors = ChipDefaults.primaryChipColors(),
            )
        }
        if (query.isNotBlank()) item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                onClick = { query = "" },
                label = { Text("Ver todos") },
                colors = ChipDefaults.secondaryChipColors(),
            )
        }
        if (query.isBlank() && recent.isNotEmpty()) item { Label("Recientes primero") }
        if (shown.isEmpty()) item { Label("Nada con «$query»") }
        shown.forEach { e ->
            item {
                Chip(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { onPick(e.id) },
                    label = { Text(e.name, maxLines = 2, overflow = TextOverflow.Ellipsis) },
                    icon = exerciseIcon(e.muscles),
                    colors = ChipDefaults.secondaryChipColors(),
                )
            }
        }
    }
}

private const val SEARCH_KEY = "query"

private fun musclesOf(library: Library?, id: String): Map<String, Int> = library?.byId?.get(id)?.muscles.orEmpty()

private fun exerciseIcon(muscles: Map<String, Int>): (@Composable BoxScope.() -> Unit)? =
    if (muscles.isEmpty()) null else ({ MuscleThumb(muscles) })

private fun routineIcon(r: LibRoutine, library: Library?): (@Composable BoxScope.() -> Unit)? {
    val m = sessionMuscles(r.exercises.map { musclesOf(library, it.exerciseId) to it.sets.size.coerceAtLeast(1) })
    return if (m.isEmpty()) null else ({ MuscleThumb(m, both = true) })
}

/** Anillo con una porción por serie del ejercicio: hechas en naranja, la actual en blanco y las pendientes apagadas. */
@Composable
private fun SetRing(sets: List<WSet>, current: Int, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val stroke = 5.dp.toPx()
        val inset = stroke / 2 + 3.dp.toPx()
        val arc = Size(size.width - inset * 2, size.height - inset * 2)
        val count = sets.size.coerceAtLeast(1)
        val gap = if (count == 1) 0f else 4f
        val sweep = 360f / count
        sets.forEachIndexed { i, set ->
            drawArc(
                color = if (i == current) TextMain else if (set.done) Accent else Track,
                startAngle = -90f + sweep * i + gap / 2,
                sweepAngle = sweep - gap,
                useCenter = false,
                topLeft = Offset(inset, inset),
                size = arc,
                style = Stroke(stroke, cap = StrokeCap.Butt),
            )
        }
    }
}

/** Botón redondo con icono y nombre accesible. */
@Composable
private fun RoundButton(
    icon: ImageVector,
    description: String,
    size: Int,
    background: Color,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val haptics = LocalHapticFeedback.current
    Box(
        Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(if (enabled) background else background.copy(alpha = 0.35f))
            .clickable(enabled = enabled, role = Role.Button, onClickLabel = description) {
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, description, tint = if (enabled) Color.White else TextDim, modifier = Modifier.size((size * 0.55f).dp))
    }
}

/** Cifra grande que se elige tocándola; la corona y los botones −/+ cambian la que esté elegida. */
@Composable
private fun ValueField(text: String, unit: String, description: String, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Column(
        Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected && enabled) Surface else Color.Transparent)
            .clickable(enabled = enabled, role = Role.Button, onClickLabel = "Ajustar $description", onClick = onClick)
            .semantics { contentDescription = "$description: $text $unit" }
            .padding(horizontal = 6.dp, vertical = 1.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text,
            fontSize = if (text.length > 4) 25.sp else 31.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            softWrap = false,
            color = if (selected && enabled) Accent else TextMain,
        )
        Text(unit, fontSize = 11.sp, color = TextDim, maxLines = 1)
    }
}

/** Todo hecho: terminar pasa a ser lo primero, sin bajar a buscarlo. */
@Composable
private fun AllDoneScreen(a: Active, now: Long, onFinish: () -> Unit, onReview: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(horizontal = 18.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Label("Todo hecho")
        Text(clock((now - a.startedAt) / 1000), fontSize = 38.sp, fontWeight = FontWeight.Bold, color = Accent)
        Label("${a.setsDone} series")
        Spacer(Modifier.height(8.dp))
        Chip(modifier = Modifier.fillMaxWidth(), onClick = onFinish, label = { Text("Terminar") }, colors = ChipDefaults.primaryChipColors())
        Chip(modifier = Modifier.fillMaxWidth(), onClick = onReview, label = { Text("Revisar series") }, colors = ChipDefaults.secondaryChipColors())
    }
}

@Composable
private fun SetScreen(a: Active, now: Long, bpm: Int?, actions: SetActions, focus: Cursor?) {
    if (a.exercises.isEmpty()) {
        Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Text("Añade ejercicios en el móvil", textAlign = TextAlign.Center)
        }
        return
    }
    var reviewing by remember(a.id) { mutableStateOf(false) }
    if (a.cursor == null && focus == null && !reviewing && actions.finish != null) {
        AllDoneScreen(a, now, actions.finish) { reviewing = true }
        return
    }
    // Serie seleccionada: por defecto la siguiente pendiente (o la elegida en el menú); se cambia con las flechas.
    val flat = remember(a) { a.exercises.flatMapIndexed { ei, e -> e.sets.indices.map { si -> Cursor(ei, si) } } }
    var idx by remember(a.cursor, a.id, focus, flat.size) { mutableStateOf((focus ?: a.cursor)?.let { c -> flat.indexOf(c).coerceAtLeast(0) } ?: (flat.size - 1)) }
    val cur = flat.getOrNull(idx) ?: return
    val ex = a.exercises[cur.ei]
    val set = ex.sets[cur.si]
    var weight by remember(cur, set) { mutableStateOf(set.weight ?: set.prevWeight) }
    var reps by remember(cur, set) { mutableStateOf(set.reps ?: set.prevReps) }
    var secs by remember(cur, set) { mutableStateOf(set.durationSec) }
    val isTime = ex.kind == "duration" || ex.kind == "distance"
    val usesWeight = ex.kind == "weight_reps" || ex.kind == "reps" || ex.kind == "assisted"
    // Cifra que cambian la corona y los botones −/+. Se empieza por el peso, que es lo que más se ajusta.
    var weightSelected by remember(cur) { mutableStateOf(usesWeight) }
    val workIndex = ex.sets.take(cur.si + 1).count { it.type != "warmup" }
    val typeLabel = when (set.type) {
        "warmup" -> "Calentamiento"
        "drop" -> "Drop set"
        "failure" -> "Al fallo"
        else -> "Serie $workIndex de ${ex.sets.count { it.type != "warmup" }}"
    }
    val haptics = LocalHapticFeedback.current
    // Una serie hecha no se edita: primero se deshace con el botón central.
    val step: (Int) -> Unit = { dir ->
        if (!set.done) {
            when {
                isTime -> secs = ((secs ?: 0) + 5 * dir).coerceAtLeast(0)
                weightSelected -> weight = stepWeight(weight, dir)
                else -> reps = ((reps ?: 0) + dir).coerceAtLeast(0)
            }
        }
    }
    val crown = remember { FocusRequester() }
    var turned by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(cur) { runCatching { crown.requestFocus() } }

    Box(
        Modifier
            .fillMaxSize()
            .onRotaryScrollEvent { e ->
                turned += e.verticalScrollPixels
                val steps = (turned / ROTARY_STEP).toInt()
                if (steps != 0) {
                    turned -= steps * ROTARY_STEP
                    repeat(abs(steps)) { step(if (steps > 0) 1 else -1) }
                    haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                }
                true
            }
            .focusRequester(crown)
            .focusable(),
        contentAlignment = Alignment.Center,
    ) {
        SetRing(ex.sets, cur.si, Modifier.fillMaxSize())
        Column(
            Modifier.fillMaxSize().padding(horizontal = 11.dp, vertical = 11.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            StatusPill(clock((now - a.startedAt) / 1000) + (bpm?.let { "  ·  $it ppm" } ?: ""), actions.menu)
            Text(
                ex.name,
                fontWeight = FontWeight.Bold,
                color = TextMain,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                fontSize = 14.sp,
                lineHeight = 16.sp,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 1.dp),
            )
            Text((if (ex.superset) "Superserie · " else "") + typeLabel, fontSize = 12.sp, color = if (set.done) Accent else TextDim, maxLines = 1)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                RoundButton(IconMinus, "Bajar", 38, Surface, enabled = !set.done) { step(-1) }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 1.dp)) {
                    if (isTime) {
                        ValueField(clock((secs ?: 0).toLong()), "tiempo", "Tiempo", selected = true, enabled = !set.done) {}
                    } else {
                        if (usesWeight) {
                            ValueField(formatWeight(weight), if (ex.kind == "assisted") "$weightUnit asist." else weightUnit, "Peso", weightSelected, !set.done) { weightSelected = true }
                            Text("×", fontSize = 16.sp, color = TextDim)
                        }
                        ValueField("${reps ?: 0}", "reps", "Repeticiones", !weightSelected, !set.done) { weightSelected = false }
                    }
                }
                RoundButton(IconPlus, "Subir", 38, Surface, enabled = !set.done) { step(1) }
            }
            if (set.prevWeight != null || set.prevReps != null) {
                Text("Anterior ${formatWeight(set.prevWeight)} × ${set.prevReps ?: "–"}", fontSize = 11.sp, color = TextDim, maxLines = 1)
            }
            Spacer(Modifier.height(3.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                RoundButton(IconPrev, "Serie anterior", 36, Surface, enabled = idx > 0) { idx-- }
                RoundButton(
                    if (set.done) IconUndo else IconCheck,
                    if (set.done) "Deshacer serie" else "Completar serie",
                    54,
                    if (set.done) Surface else Accent,
                ) {
                    if (set.done) actions.uncomplete(cur.ei, cur.si)
                    else actions.complete(cur.ei, cur.si, if (usesWeight) weight else null, if (isTime) null else reps, if (isTime) secs else null)
                }
                RoundButton(IconNext, "Serie siguiente", 36, Surface, enabled = idx < flat.size - 1) { idx++ }
            }
        }
    }
}

/** Tiempo del entreno arriba del todo; al tocarlo se abre el menú (ejercicios y terminar). */
@Composable
private fun StatusPill(text: String, onMenu: (() -> Unit)?) {
    Row(
        Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Surface)
            .clickable(enabled = onMenu != null, role = Role.Button, onClickLabel = "Abrir menú del entreno") { onMenu?.invoke() }
            .padding(horizontal = 9.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (onMenu != null) Icon(IconMenu, "Menú del entreno", tint = TextDim, modifier = Modifier.size(13.dp))
        Text(text, fontSize = 12.sp, color = TextMain, maxLines = 1)
    }
}

private fun nextSetText(e: WExercise, s: WSet?): String? {
    if (s == null) return null
    if (e.kind == "duration" || e.kind == "distance") return s.durationSec?.let { clock(it.toLong()) }
    val weight = s.weight ?: s.prevWeight
    val reps = s.reps ?: s.prevReps
    if (weight == null && reps == null) return null
    return (weight?.let { "${formatWeight(it)} $weightUnit × " } ?: "") + (reps ?: "–")
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
    val ending = left <= 5
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(
            progress = left.toFloat() / total,
            modifier = Modifier.fillMaxSize().padding(3.dp),
            strokeWidth = 6.dp,
            indicatorColor = if (ending) TextMain else Accent,
            trackColor = Track,
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(horizontal = 18.dp)) {
            Text("Descanso" + (bpm?.let { "  ·  $it ppm" } ?: ""), fontSize = 12.sp, color = TextDim, maxLines = 1)
            Text(clock(left), fontSize = 54.sp, fontWeight = FontWeight.Bold, color = if (ending) Accent else TextMain, maxLines = 1)
            if (next != null) {
                val (e, s) = next
                Text(e.name, fontSize = 13.sp, color = TextMain, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 6.dp))
                nextSetText(e, s)?.let { Text(it, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Accent, maxLines = 1) }
            }
            Spacer(Modifier.height(5.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                RestStep("−15", "Quitar 15 segundos") { actions.restAdd(-15) }
                RoundButton(IconSkip, "Saltar descanso", 52, Accent) { actions.restSkip() }
                RestStep("+15", "Añadir 15 segundos") { actions.restAdd(15) }
            }
        }
    }
}

@Composable
private fun RestStep(text: String, description: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(Surface)
            .clickable(role = Role.Button, onClickLabel = description, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Text(text, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1) }
}
