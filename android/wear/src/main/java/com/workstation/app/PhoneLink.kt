package com.workstation.app

import android.content.Context
import android.net.Uri
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject

/** Conexión con el móvil: recibe el estado por Data Layer y envía comandos por MessageClient. */
class PhoneLink(context: Context) : DataClient.OnDataChangedListener {
    private val ctx = context.applicationContext
    private val dataClient = Wearable.getDataClient(ctx)
    private val messageClient = Wearable.getMessageClient(ctx)
    private val nodeClient = Wearable.getNodeClient(ctx)

    private val _state = MutableStateFlow<WatchState?>(null)
    val state: StateFlow<WatchState?> = _state

    // Hasta comprobarlo, se asume desconectado (y se comprueba al arrancar).
    // Rutinas, biblioteca e historial para entrenar sin el móvil. El Data Layer lo guarda en el reloj.
    private val _library = MutableStateFlow<Library?>(null)
    val library: StateFlow<Library?> = _library

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected

    fun start() {
        dataClient.addListener(this)
        // Último estado guardado (aunque el móvil no haya enviado nada desde que abrimos la app).
        dataClient.getDataItems(Uri.parse("wear://*${PATH_STATE}")).addOnSuccessListener { buffer ->
            buffer.forEach { item ->
                if (item.uri.path == PATH_STATE) DataMapItem.fromDataItem(item).dataMap.getString(KEY_JSON)?.let(::applyJson)
            }
            buffer.release()
        }
        dataClient.getDataItems(Uri.parse("wear://*${PATH_LIBRARY}")).addOnSuccessListener { buffer ->
            buffer.forEach { item ->
                if (item.uri.path == PATH_LIBRARY) DataMapItem.fromDataItem(item).dataMap.getString(KEY_JSON)?.let(::applyLibrary)
            }
            buffer.release()
        }
        // Entrenos del reloj cuyo DataItem ya no existe: el móvil los guardó y lo borró.
        dataClient.getDataItems(Uri.parse("wear://*${LocalStore.PATH_WORKOUT}"), DataClient.FILTER_PREFIX).addOnSuccessListener { buffer ->
            val ids = buffer.mapNotNull { LocalStore.workoutId(it.uri.path) }.toSet()
            buffer.release()
            LocalStore.keepOnly(ids)
        }
        send(Cmd.hello())
    }

    fun stop() {
        dataClient.removeListener(this)
    }

    override fun onDataChanged(events: DataEventBuffer) {
        events.forEach { e ->
            val path = e.dataItem.uri.path
            if (e.type == DataEvent.TYPE_CHANGED && (path == PATH_STATE || path == PATH_LIBRARY)) {
                val json = DataMapItem.fromDataItem(e.dataItem).dataMap.getString(KEY_JSON) ?: return@forEach
                if (path == PATH_STATE) applyJson(json) else applyLibrary(json)
            }
            if (e.type == DataEvent.TYPE_DELETED) LocalStore.workoutId(path)?.let { LocalStore.confirm(listOf(it)) }
        }
        events.release()
    }

    private fun applyJson(json: String) {
        val s = parseState(json) ?: return
        val cur = _state.value
        if (cur != null && s.sentAt < cur.sentAt) return
        weightUnit = s.unit // solo un estado más nuevo cambia la unidad
        // Un entreno "en curso" de hace más de 6 h es un resto de una app del móvil que se cerró: se ignora.
        val stale = s.active != null && System.currentTimeMillis() - s.sentAt > STALE_MS
        _state.value = if (stale) s.copy(active = null) else s
    }

    private fun applyLibrary(json: String) {
        val lib = parseLibrary(json) ?: return
        val cur = _library.value
        if (cur != null && lib.sentAt < cur.sentAt) return
        if (_state.value == null) weightUnit = lib.unit
        _library.value = lib
        LocalStore.confirm(lib.recent.map { it.id })
    }

    fun send(cmd: JSONObject) {
        val bytes = cmd.toString().toByteArray(Charsets.UTF_8)
        nodeClient.connectedNodes
            .addOnSuccessListener { nodes ->
                _connected.value = nodes.isNotEmpty()
                nodes.forEach { messageClient.sendMessage(it.id, PATH_CMD, bytes) }
            }
            .addOnFailureListener { _connected.value = false }
    }

    companion object {
        const val PATH_STATE = "/workstation/state"
        const val PATH_LIBRARY = "/workstation/library"
        const val PATH_CMD = "/workstation/cmd"
        const val KEY_JSON = "json"
        private const val STALE_MS = 6 * 60 * 60 * 1000L
    }
}
