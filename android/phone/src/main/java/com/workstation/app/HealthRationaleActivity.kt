package com.workstation.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast

/** Health Connect la abre desde el enlace «política de privacidad» de su pantalla de permisos. La dirección es fija: ignora el intent recibido. */
class HealthRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL)))
        } catch (e: Exception) {
            Toast.makeText(this, PRIVACY_URL, Toast.LENGTH_LONG).show()
        }
        finish()
    }

    private companion object {
        const val PRIVACY_URL = "https://github.com/adriarroyo08/WorkStation/blob/main/PRIVACY.md"
    }
}
