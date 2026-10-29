package com.workstation.app

import org.json.JSONObject

/**
 * Reparte los mensajes del reloj a la web. Si la actividad no está viva todavía, los guarda
 * (como mucho los últimos 50) y los entrega al abrirse.
 */
object WatchBus {
    private var activity: MainActivity? = null
    private val queue = ArrayDeque<JSONObject>()
    // El pulso llega cada 5 s: solo se guarda el último para que no expulse de la cola los comandos importantes.
    private var lastHr: JSONObject? = null

    @Synchronized
    fun attach(a: MainActivity) {
        activity = a
        while (queue.isNotEmpty()) a.sendToWeb(queue.removeFirst())
        lastHr?.let(a::sendToWeb)
        lastHr = null
    }

    @Synchronized
    fun detach(a: MainActivity) {
        if (activity === a) activity = null
    }

    @Synchronized
    fun attached() = activity != null

    @Synchronized
    fun post(message: JSONObject) {
        val a = activity
        if (a != null) a.sendToWeb(message)
        else {
            if (queue.size >= 50) queue.removeFirst()
            queue.addLast(message)
        }
    }

    @Synchronized
    fun watchCommand(payload: String) {
        val msg = JSONObject().put("kind", "watch_cmd").put("payload", payload)
        val isHr = runCatching { JSONObject(payload).optString("type") == "hr" }.getOrDefault(false)
        val a = activity
        when {
            a != null -> a.sendToWeb(msg)
            isHr -> lastHr = msg
            else -> {
                if (queue.size >= 50) queue.removeFirst()
                queue.addLast(msg)
            }
        }
    }
}
