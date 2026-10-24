package com.workstation.app

import android.content.Intent
import android.net.Uri
import android.util.Base64
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.wear.remote.interactions.RemoteActivityHelper
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * API expuesta a la web como `window.WorkstationNative` (ver app/src/native.ts).
 * Los métodos @JavascriptInterface se ejecutan en un hilo de fondo del WebView.
 */
class NativeBridge(private val activity: MainActivity) {
    private val ctx = activity.applicationContext

    /** Estado del entrenamiento → reloj (Data Layer: se sincroniza aunque el reloj esté desconectado un rato). */
    @JavascriptInterface
    fun sendToWatch(json: String) {
        val req = PutDataMapRequest.create(Protocol.PATH_STATE).apply {
            dataMap.putString(Protocol.KEY_JSON, json)
            dataMap.putLong("ts", System.currentTimeMillis())
        }.asPutDataRequest().setUrgent()
        Wearable.getDataClient(ctx).putDataItem(req)
    }

    @JavascriptInterface
    fun requestWatchStatus() {
        Wearable.getNodeClient(ctx).connectedNodes
            .addOnSuccessListener { nodes ->
                activity.sendToWeb(JSONObject().put("kind", "watch_status").put("nodes", JSONArray(nodes.map { it.displayName })))
            }
            .addOnFailureListener {
                // Sin Google Play Services / Wear OS: ningún reloj.
                activity.sendToWeb(JSONObject().put("kind", "watch_status").put("nodes", JSONArray()))
            }
    }

    @JavascriptInterface
    fun openWatchApp() {
        val toast = { msg: String -> activity.runOnUiThread { Toast.makeText(activity, msg, Toast.LENGTH_LONG).show() } }
        Wearable.getNodeClient(ctx).connectedNodes
            .addOnSuccessListener { nodes ->
                if (nodes.isEmpty()) return@addOnSuccessListener toast("No hay ningún reloj conectado")
                val helper = RemoteActivityHelper(ctx)
                val intent = Intent(Intent.ACTION_VIEW)
                    .addCategory(Intent.CATEGORY_BROWSABLE)
                    .setData(Uri.parse("workstation://open"))
                nodes.forEach { helper.startRemoteActivity(intent, it.id) }
                toast("Abriendo Workstation en el reloj…")
            }
            .addOnFailureListener { toast("No se pudo conectar con el reloj (¿tiene Workstation instalada?)") }
    }

    @JavascriptInterface
    fun scheduleRest(endAtMs: Double, label: String) = RestAlarmReceiver.schedule(ctx, endAtMs.toLong(), label)

    @JavascriptInterface
    fun cancelRest() = RestAlarmReceiver.cancel(ctx)

    @JavascriptInterface
    fun workoutOngoing(name: String, startedAtMs: Double, restEndAtMs: Double) =
        WorkoutService.update(ctx, name, startedAtMs.toLong(), restEndAtMs.toLong())

    @JavascriptInterface
    fun workoutEnded() {
        WorkoutService.stop(ctx)
        RestAlarmReceiver.cancel(ctx)
    }

    @JavascriptInterface
    fun setSystemBars(dark: Boolean) = activity.setSystemBars(dark)

    @JavascriptInterface
    fun notificationsState(): String = activity.notificationsState()

    @JavascriptInterface
    fun requestNotifications() = activity.requestNotifications()

    /** Credential Manager necesita la Activity y el hilo principal; la respuesta llega como google_token | google_cancel | google_error. */
    @JavascriptInterface
    fun googleSignIn(webClientId: String, hashedNonce: String) =
        activity.runOnUiThread { GoogleSignIn.start(activity, webClientId, hashedNonce) }

    /** Menú nativo de compartir (navigator.share no existe en el WebView). */
    @JavascriptInterface
    fun shareText(title: String, text: String) {
        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text).putExtra(Intent.EXTRA_SUBJECT, title)
        activity.runOnUiThread {
            try {
                activity.startActivity(Intent.createChooser(send, title))
            } catch (e: Exception) {
                Toast.makeText(activity, "No se pudo compartir: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    /** Las descargas de la web (backups, CSV, imágenes) se guardan en caché y se abren con el selector "Compartir". */
    @JavascriptInterface
    fun saveFile(name: String, mime: String, base64: String) {
        val dir = File(ctx.cacheDir, "exports").apply { mkdirs() }
        val safe = name.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val file = File(dir, safe)
        file.writeBytes(Base64.decode(base64, Base64.DEFAULT))
        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", file)
        val send = Intent(Intent.ACTION_SEND)
            .setType(mime)
            .putExtra(Intent.EXTRA_STREAM, uri)
            .putExtra(Intent.EXTRA_TITLE, safe)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        activity.runOnUiThread {
            try {
                activity.startActivity(Intent.createChooser(send, safe))
            } catch (e: Exception) {
                Toast.makeText(activity, "No se pudo compartir: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}
