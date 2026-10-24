package com.workstation.app

import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import org.json.JSONObject

/** Inicio de sesión con Google (Credential Manager). El resultado vuelve a la web como google_token | google_cancel | google_error. */
object GoogleSignIn {
    fun start(activity: MainActivity, webClientId: String, hashedNonce: String) {
        val reply = { m: JSONObject -> activity.sendToWeb(m) }
        try {
            val option = GetGoogleIdOption.Builder()
                .setServerClientId(webClientId)
                .setNonce(hashedNonce)
                .setFilterByAuthorizedAccounts(false)
                .build()
            val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
            CredentialManager.create(activity).getCredentialAsync(
                activity, request, CancellationSignal(), ContextCompat.getMainExecutor(activity),
                object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                    override fun onResult(result: GetCredentialResponse) {
                        try {
                            val token = GoogleIdTokenCredential.createFrom(result.credential.data).idToken
                            reply(JSONObject().put("kind", "google_token").put("token", token))
                        } catch (e: Exception) {
                            reply(JSONObject().put("kind", "google_error").put("message", e.message ?: "Respuesta de Google no válida"))
                        }
                    }

                    override fun onError(e: GetCredentialException) {
                        if (e is GetCredentialCancellationException) reply(JSONObject().put("kind", "google_cancel"))
                        else reply(JSONObject().put("kind", "google_error").put("message", e.message ?: e.type))
                    }
                },
            )
        } catch (e: Exception) {
            reply(JSONObject().put("kind", "google_error").put("message", e.message ?: "No se pudo iniciar Google"))
        }
    }
}
