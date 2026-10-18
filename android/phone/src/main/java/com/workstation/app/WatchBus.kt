package com.workstation.app

import org.json.JSONObject

/**
 * Reparte los mensajes del reloj a la web. Si la actividad no está viva todavía, los guarda
 * (como mucho los últimos 50) y los entrega al abrirse.
 */
object WatchBus {
    private var activity: MainActivity? = null
    private val queue = ArrayDeque<JSONObject>()

    @Synchronized
    fun attach(a: MainActivity) {
        activity = a
        while (queue.isNotEmpty()) a.sendToWeb(queue.removeFirst())
    }

    @Synchronized
    fun detach(a: MainActivity) {
        if (activity === a) activity = null
    }

    @Synchronized
    fun post(message: JSONObject) {
        val a = activity
        if (a != null) a.sendToWeb(message)
        else {
            if (queue.size >= 50) queue.removeFirst()
            queue.addLast(message)
        }
    }

    fun watchCommand(payload: String) = post(JSONObject().put("kind", "watch_cmd").put("payload", payload))
}
