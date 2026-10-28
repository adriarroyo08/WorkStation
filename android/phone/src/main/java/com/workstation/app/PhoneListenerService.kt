package com.workstation.app

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/** Mensajes del reloj → web. Ruta /workstation/cmd con un JSON (ver shared/session.ts → WatchCommand). */
class PhoneListenerService : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) {
        if (event.path == Protocol.PATH_CMD) WatchBus.watchCommand(String(event.data, Charsets.UTF_8))
    }

    // Entrenos terminados en el reloj: llegan aunque la app del móvil esté cerrada.
    override fun onDataChanged(events: DataEventBuffer) {
        val workouts = events.filter { it.type == DataEvent.TYPE_CHANGED && it.dataItem.uri.path.orEmpty().startsWith(WatchWorkouts.PATH_PREFIX) }
            .mapNotNull { DataMapItem.fromDataItem(it.dataItem).dataMap.getString(Protocol.KEY_JSON) }
        events.release()
        workouts.forEach { WatchWorkouts.received(this, it) }
    }
}

object Protocol {
    const val PATH_STATE = "/workstation/state"
    const val PATH_CMD = "/workstation/cmd"
    const val KEY_JSON = "json"
}
