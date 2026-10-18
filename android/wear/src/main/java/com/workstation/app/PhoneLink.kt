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

    private val _connected = MutableStateFlow(true)
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
        send(Cmd.hello())
    }

    fun stop() {
        dataClient.removeListener(this)
    }

    override fun onDataChanged(events: DataEventBuffer) {
        events.forEach { e ->
            if (e.type == DataEvent.TYPE_CHANGED && e.dataItem.uri.path == PATH_STATE) {
                DataMapItem.fromDataItem(e.dataItem).dataMap.getString(KEY_JSON)?.let(::applyJson)
            }
        }
        events.release()
    }

    private fun applyJson(json: String) {
        val s = parseState(json) ?: return
        val cur = _state.value
        if (cur == null || s.sentAt >= cur.sentAt) _state.value = s
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
        const val PATH_CMD = "/workstation/cmd"
        const val KEY_JSON = "json"
    }
}
