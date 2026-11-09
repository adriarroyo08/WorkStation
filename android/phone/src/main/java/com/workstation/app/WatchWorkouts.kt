package com.workstation.app

import android.content.Context
import android.content.SharedPreferences
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
import java.time.Instant
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * Entrenos hechos en el reloj (DataItem /workstation/workout/<id>, JSON de Workout). Con la app abierta los guarda
 * la web; si no, se suben a la nube con la API key del reloj (RPC api_upsert). El DataItem se borra cuando queda
 * guardado; mientras tanto el Data Layer lo conserva y la web lo recoge al abrirse.
 *
 * La key se guarda cifrada (DeviceCipher) y nunca vuelve a la web. Al sustituirla o borrarla pasa a una cola, también
 * cifrada, que WatchKeyRevokeWorker vacía con la RPC api_revoke_key: esa revocación no necesita sesión ni la app abierta.
 */
object WatchWorkouts {
    const val PATH_PREFIX = "/workstation/workout/"
    const val PATH_LIBRARY = "/workstation/library"
    private const val PREFS = "watch_upload"
    private const val KEY_LEGACY = "cfg" // en claro, de versiones anteriores: se cifra en la primera lectura
    private const val KEY_CONFIG = "cfg_enc"
    private const val KEY_PENDING = "revoke_enc"
    // Una key sin caducidad deja de reintentarse pasado este tiempo; las demás, al caducar.
    private val PENDING_MAX_MS = TimeUnit.DAYS.toMillis(90)

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

    /** Guarda las credenciales ('' las borra) y deja pendiente de revocar la key anterior. false si no se han podido guardar. */
    fun setUpload(ctx: Context, json: String): Boolean {
        val replaced = synchronized(this) {
            val p = prefs(ctx)
            val old = config(ctx, p)
            val edit = p.edit().remove(KEY_LEGACY)
            if (json.isEmpty()) edit.remove(KEY_CONFIG) else edit.putString(KEY_CONFIG, DeviceCipher.encrypt(json) ?: return false)
            val previous = old?.takeIf { it.optString("apiKey") != runCatching { JSONObject(json).optString("apiKey") }.getOrNull() }
            if (previous != null) {
                val pending = pending(p).put(pendingEntry(previous))
                edit.putString(KEY_PENDING, DeviceCipher.encrypt(pending.toString()) ?: return false)
            }
            if (!edit.commit()) return false
            previous != null
        }
        if (replaced) WatchKeyRevokeWorker.schedule(ctx)
        return true
    }

    fun uploadUser(ctx: Context): String = config(ctx)?.optString("userId").orEmpty()

    fun uploadExpiry(ctx: Context): String = config(ctx)?.optString("expiresAt").orEmpty()

    /** Revoca lo que siga en la cola. true si no queda nada por reintentar. */
    fun revokePending(ctx: Context): Boolean {
        val now = System.currentTimeMillis()
        val all = synchronized(this) { pending(prefs(ctx)) }
        val entries = (0 until all.length()).map { all.getJSONObject(it) }
        // Las peticiones van fuera del cerrojo: se quita solo lo procesado, por si entra otra entrada mientras tanto.
        val done = entries.filter { it.optLong("until") <= now || revoke(it) }.map { it.getString("apiKey") }.toSet()
        return synchronized(this) {
            val p = prefs(ctx)
            val current = pending(p)
            val left = JSONArray((0 until current.length()).map { current.getJSONObject(it) }.filter { it.getString("apiKey") !in done })
            val saved = when {
                done.isEmpty() -> true
                left.length() == 0 -> p.edit().remove(KEY_PENDING).commit()
                else -> DeviceCipher.encrypt(left.toString())?.let { p.edit().putString(KEY_PENDING, it).commit() } ?: false
            }
            saved && left.length() == 0
        }
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun config(ctx: Context): JSONObject? = synchronized(this) { config(ctx, prefs(ctx)) }

    private fun config(ctx: Context, p: SharedPreferences): JSONObject? {
        val legacy = p.getString(KEY_LEGACY, null)
        if (legacy != null) {
            // Si el Keystore falla, sigue en claro y se reintenta; nunca se pierde una key que aún hay que poder revocar.
            DeviceCipher.encrypt(legacy)?.let { p.edit().putString(KEY_CONFIG, it).remove(KEY_LEGACY).commit() }
            return parse(legacy)
        }
        return p.getString(KEY_CONFIG, null)?.let { DeviceCipher.decrypt(it) }?.let { parse(it) }
    }

    private fun pending(p: SharedPreferences): JSONArray =
        p.getString(KEY_PENDING, null)?.let { DeviceCipher.decrypt(it) }?.let { runCatching { JSONArray(it) }.getOrNull() } ?: JSONArray()

    private fun pendingEntry(c: JSONObject): JSONObject {
        val expiry = runCatching { Instant.parse(c.optString("expiresAt")).toEpochMilli() }.getOrNull()
        return JSONObject()
            .put("url", c.getString("url"))
            .put("anonKey", c.getString("anonKey"))
            .put("apiKey", c.getString("apiKey"))
            .put("until", expiry ?: (System.currentTimeMillis() + PENDING_MAX_MS))
    }

    private fun parse(json: String) = json.takeIf { it.isNotEmpty() }?.let { runCatching { JSONObject(it) }.getOrNull() }

    private fun message(json: String) = JSONObject().put("kind", "watch_workout").put("payload", json)

    private fun idOf(json: String) = runCatching { JSONObject(json).getString("id") }.getOrNull()

    // Se llama desde el hilo de fondo del listener: bloquear aquí no afecta a la interfaz.
    private fun upload(ctx: Context, json: String): Boolean {
        val c = config(ctx) ?: return false
        val id = idOf(json) ?: return false
        return runCatching {
            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date())
            val row = JSONObject().put("collection", "workouts").put("id", id).put("doc", JSONObject(json)).put("deleted", false).put("client_updated_at", now)
            rpc(c, "api_upsert", JSONObject().put("p_key", c.getString("apiKey")).put("p_rows", JSONArray().put(row)))
        }.getOrDefault(false)
    }

    private fun revoke(entry: JSONObject): Boolean =
        runCatching { rpc(entry, "api_revoke_key", JSONObject().put("p_key", entry.getString("apiKey"))) }.getOrDefault(false)

    private fun rpc(c: JSONObject, function: String, payload: JSONObject): Boolean {
        val anon = c.getString("anonKey")
        val conn = URL("${c.getString("url").trimEnd('/')}/rest/v1/rpc/$function").openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.doOutput = true
        conn.setRequestProperty("apikey", anon)
        conn.setRequestProperty("authorization", "Bearer $anon")
        conn.setRequestProperty("content-type", "application/json")
        conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
        val ok = conn.responseCode in 200..299
        conn.disconnect()
        return ok
    }
}
