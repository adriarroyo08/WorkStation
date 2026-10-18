package com.workstation.app

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/** Mensajes del reloj → web. Ruta /workstation/cmd con un JSON (ver shared/session.ts → WatchCommand). */
class PhoneListenerService : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) {
        if (event.path == Protocol.PATH_CMD) WatchBus.watchCommand(String(event.data, Charsets.UTF_8))
    }
}

object Protocol {
    const val PATH_STATE = "/workstation/state"
    const val PATH_CMD = "/workstation/cmd"
    const val KEY_JSON = "json"
}
