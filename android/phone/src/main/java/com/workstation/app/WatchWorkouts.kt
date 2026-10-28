package com.workstation.app

import android.content.Context
import android.net.Uri
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Entrenos hechos en el reloj (DataItem /workstation/workout/<id>, JSON de Workout). Con la app abierta los guarda
 * la web; si no, se suben a la nube con la API key del reloj (RPC api_upsert). El DataItem se borra cuando queda
 * guardado; mientras tanto el Data Layer lo conserva y la web lo recoge al abrirse.
 */
object WatchWorkouts {
    const val PATH_PREFIX = "/workstation/workout/"
    const val PATH_LIBRARY = "/workstation/library"
    private const val PREFS = "watch_upload"

    fun received(ctx: Context, json: String) {
        if (WatchBus.attached()) WatchBus.post(message(json)) else if (upload(ctx, json)) idOf(json)?.let { ack(ctx, it) }
    }

    /** La web acaba de abrirse: le pasa los que sigan pendientes. */
    fun scan(ctx: Context) {
        Wearable.getDataClient(ctx).getDataItems(Uri.parse("wear://*$PATH_PREFIX"), DataClient.FILTER_PREFIX).addOnSuccessListener { buffer ->
            val items = buffer.mapNotNull { DataMapItem.fromDataItem(it).dataMap.getString(Protocol.KEY_JSON) }
            buffer.release()
            items.forEach { WatchBus.post(message(it)) }
        }
    }

    fun ack(ctx: Context, id: String) {
        Wearable.getDataClient(ctx).deleteDataItems(Uri.parse("wear://*$PATH_PREFIX$id"))
    }

    fun sendLibrary(ctx: Context, json: String) {
        val req = PutDataMapRequest.create(PATH_LIBRARY).apply { dataMap.putString(Protocol.KEY_JSON, json) }.asPutDataRequest()
        Wearable.getDataClient(ctx).putDataItem(req)
    }

    fun setUpload(ctx: Context, json: String) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("cfg", json).apply()

    fun uploadUser(ctx: Context): String = config(ctx)?.optString("userId").orEmpty()

    private fun config(ctx: Context): JSONObject? =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("cfg", null)?.takeIf { it.isNotEmpty() }?.let { runCatching { JSONObject(it) }.getOrNull() }

    private fun message(json: String) = JSONObject().put("kind", "watch_workout").put("payload", json)

    private fun idOf(json: String) = runCatching { JSONObject(json).getString("id") }.getOrNull()

    // Se llama desde el hilo de fondo del listener: bloquear aquí no afecta a la interfaz.
    private fun upload(ctx: Context, json: String): Boolean {
        val c = config(ctx) ?: return false
        val id = idOf(json) ?: return false
        return runCatching {
            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date())
            val row = JSONObject().put("collection", "workouts").put("id", id).put("doc", JSONObject(json)).put("deleted", false).put("client_updated_at", now)
            val body = JSONObject().put("p_key", c.getString("apiKey")).put("p_rows", JSONArray().put(row)).toString().toByteArray(Charsets.UTF_8)
            val anon = c.getString("anonKey")
            val conn = URL("${c.getString("url").trimEnd('/')}/rest/v1/rpc/api_upsert").openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.doOutput = true
            conn.setRequestProperty("apikey", anon)
            conn.setRequestProperty("authorization", "Bearer $anon")
            conn.setRequestProperty("content-type", "application/json")
            conn.outputStream.use { it.write(body) }
            val ok = conn.responseCode in 200..299
            conn.disconnect()
            ok
        }.getOrDefault(false)
    }
}
