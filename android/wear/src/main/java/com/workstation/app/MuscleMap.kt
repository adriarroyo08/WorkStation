package com.workstation.app

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.dp

// Silueta muscular del reloj: la misma geometría que el mapa de la PWA (app/src/components/BodyMap.tsx), con un
// color por grupo muscular. Coordenadas del viewBox de la PWA: figura frontal centrada en x=50, trasera en x=150.

private val Muscle = Color(0xFFF2600C)
private val Body = Color(0xFF4A4A4E)

private sealed class Shape(val m: String?) {
    class Oval(m: String?, val cx: Float, val cy: Float, val rx: Float, val ry: Float) : Shape(m)
    class Rect(m: String?, val x: Float, val y: Float, val w: Float, val h: Float, val r: Float) : Shape(m)
}

private fun pair(m: String, cx: Float, dx: Float, cy: Float, rx: Float, ry: Float) =
    listOf(Shape.Oval(m, cx - dx, cy, rx, ry), Shape.Oval(m, cx + dx, cy, rx, ry))

private fun figure(cx: Float, back: Boolean): List<Shape> {
    val base = listOf(Shape.Oval(null, cx, 16f, 9f, 10f), Shape.Rect(if (back) "cuello" else null, cx - 4, 25f, 8f, 8f, 2f))
    if (!back) return base +
        pair("hombros", cx, 15.5f, 42f, 5.5f, 6f) + pair("hombros", cx, 21.5f, 43f, 3.2f, 6f) +
        pair("pecho", cx, 8f, 51.5f, 8.5f, 7.5f) +
        pair("biceps", cx, 24.7f, 59f, 2.4f, 7.5f) + pair("biceps", cx, 21.4f, 59f, 2.4f, 7.5f) + pair("biceps", cx, 23f, 68.5f, 3.4f, 2.4f) +
        pair("antebrazo", cx, 29.5f, 76f, 2.4f, 5f) + pair("antebrazo", cx, 26f, 85f, 3.6f, 9.5f) +
        listOf(
            Shape.Rect("core", cx - 6, 62f, 12f, 13f, 3f), Shape.Rect("core", cx - 6, 76f, 12f, 14f, 3f),
            Shape.Rect("core", cx - 11, 64f, 4f, 22f, 2f), Shape.Rect("core", cx + 7, 64f, 4f, 22f, 2f),
        ) +
        pair("abductores", cx, 15f, 100f, 2.5f, 6f) + listOf(Shape.Oval("aductores", cx, 111f, 3f, 10f)) +
        pair("cuadriceps", cx, 8f, 117f, 3.2f, 17f) + pair("cuadriceps", cx, 12.6f, 120f, 2.6f, 15f) + pair("cuadriceps", cx, 4.4f, 129f, 2.6f, 7f) +
        pair("gemelos", cx, 7f, 160f, 4.5f, 12f)
    return base +
        listOf(Shape.Oval("trapecio", cx, 37f, 13f, 5f), Shape.Rect("espalda", cx - 12, 42.5f, 24f, 4.5f, 2f)) +
        pair("hombros", cx, 21.5f, 43f, 3.2f, 6f) + pair("hombros", cx, 16f, 42.5f, 5f, 5.5f) +
        listOf(Shape.Rect("espalda", cx - 6, 48f, 12f, 12f, 3f)) + pair("espalda", cx, 11.5f, 51.5f, 3.6f, 3f) +
        pair("dorsales", cx, 11f, 59.5f, 5f, 5f) + pair("dorsales", cx, 9.5f, 69.5f, 4.5f, 5.5f) +
        pair("triceps", cx, 21.4f, 59f, 2.4f, 7.5f) + pair("triceps", cx, 24.7f, 58f, 2.4f, 6.5f) + pair("triceps", cx, 23f, 68.5f, 3.4f, 2.4f) +
        pair("antebrazo", cx, 26f, 83f, 3.8f, 10f) +
        listOf(Shape.Rect("lumbar", cx - 5, 62f, 10f, 25f, 3f)) +
        pair("gluteos", cx, 10.5f, 90.5f, 5f, 3.5f) + pair("gluteos", cx, 7f, 100f, 7f, 7f) +
        pair("abductores", cx, 15f, 102f, 2.5f, 6f) +
        pair("isquios", cx, 8f, 124f, 6.5f, 16f) +
        pair("gemelos", cx, 7f, 155f, 5.5f, 8f) + pair("gemelos", cx, 7f, 166f, 4f, 5f)
}

private val FRONT = figure(50f, false)
private val BACK = figure(150f, true)
private val FRONT_GROUPS = FRONT.mapNotNull { it.m }.toSet()
private val BACK_GROUPS = BACK.mapNotNull { it.m }.toSet()

/** Músculos de una sesión: suma la intensidad de cada ejercicio por sus series y normaliza a 0-100. */
fun sessionMuscles(items: List<Pair<Map<String, Int>, Int>>): Map<String, Int> {
    val score = HashMap<String, Float>()
    for ((m, sets) in items) for ((g, pct) in m) score[g] = (score[g] ?: 0f) + pct / 100f * sets
    val max = score.values.maxOrNull() ?: return emptyMap()
    if (max <= 0f) return emptyMap()
    return score.mapValues { (it.value / max * 100).toInt() }
}

/**
 * Silueta de un ejercicio (una sola vista: la del músculo principal) o, con [both], de una sesión entera.
 * Decorativa: el nombre del ejercicio ya está al lado.
 */
@Composable
fun MuscleThumb(muscles: Map<String, Int>, both: Boolean = false, modifier: Modifier = Modifier) {
    if (muscles.isEmpty()) return
    val shapes = remember(muscles, both) {
        val main = muscles.maxByOrNull { it.value }?.key
        val back = main != null && main !in FRONT_GROUPS && main in BACK_GROUPS
        when {
            both -> FRONT + BACK
            back -> BACK
            else -> FRONT
        }
    }
    // Recorte del viewBox de la PWA: 70×168 por figura, 172×168 con las dos.
    val left = if (both) 14f else if (shapes === BACK) 115f else 15f
    val width = if (both) 172f else 70f
    Canvas(modifier.size(if (both) 40.dp else 18.dp, if (both) 39.dp else 42.dp)) {
        val k = min(size.width / width, size.height / 168f)
        val ox = (size.width - width * k) / 2 - left * k
        val oy = (size.height - 168f * k) / 2 - 4f * k
        for (s in shapes) {
            val v = s.m?.let { muscles[it] } ?: 0
            val color = if (v > 0) Muscle.copy(alpha = 0.25f + 0.75f * v / 100f) else Body
            draw(s, color, k, ox, oy)
        }
    }
}

private fun min(a: Float, b: Float) = if (a < b) a else b

private fun DrawScope.draw(s: Shape, color: Color, k: Float, ox: Float, oy: Float) {
    when (s) {
        is Shape.Oval -> drawOval(color, Offset(ox + (s.cx - s.rx) * k, oy + (s.cy - s.ry) * k), Size(2 * s.rx * k, 2 * s.ry * k))
        is Shape.Rect -> drawRoundRect(color, Offset(ox + s.x * k, oy + s.y * k), Size(s.w * k, s.h * k), CornerRadius(s.r * k))
    }
}
