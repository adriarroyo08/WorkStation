package com.workstation.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.addCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.ServiceWorkerClientCompat
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/**
 * Contenedor de la web de Workstation. La PWA va empaquetada en assets/www y se sirve desde
 * https://appassets.androidplatform.net para que IndexedDB, el service worker y las APIs web
 * funcionen como en Chrome. El objeto JS `WorkstationNative` conecta la web con el reloj.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pageReady = false
    private val pending = ArrayDeque<String>()

    private val pickFiles = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res.resultCode, res.data))
        fileCallback = null
    }

    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Notifications.ensureChannels(this)

        val assets = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        setContentView(webView)
        // Respeta barra de estado, navegación y teclado (Android 15 dibuja de borde a borde).
        ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assets.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == WebViewAssetLoader.DEFAULT_DOMAIN) return false
                // Enlaces externos (p. ej. para sacar la API key) en el navegador.
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                pageReady = true
                while (pending.isNotEmpty()) deliver(pending.removeFirst())
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    pickFiles.launch(params.createIntent())
                    true
                } catch (e: Exception) {
                    fileCallback = null
                    false
                }
            }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(object : ServiceWorkerClientCompat() {
                override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? =
                    assets.shouldInterceptRequest(request.url)
            })
        }
        webView.addJavascriptInterface(NativeBridge(this), "WorkstationNative")

        // Tras cerrarse el proceso, restoreState puede no devolver nada: entonces se carga de nuevo la app.
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) webView.loadUrl(appUrl(intent))

        // "Atrás" cierra primero lo que haya abierto en la web (hojas, pantallas); si no hay nada, la app pasa a
        // segundo plano en vez de cerrarse (así no se pierde el entrenamiento en curso).
        onBackPressedDispatcher.addCallback(this) {
            if (!pageReady) {
                moveTaskToBack(true)
                return@addCallback
            }
            webView.evaluateJavascript("window.__workstationBack ? window.__workstationBack() : false") { handled ->
                if (handled != "true") moveTaskToBack(true)
            }
        }

        WatchBus.attach(this)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    /** Enlaces de rutinas compartidas (https://…/WorkStation/#rutina=…) se abren dentro de la app. */
    private fun appUrl(i: Intent?): String {
        val base = "https://${WebViewAssetLoader.DEFAULT_DOMAIN}/assets/www/index.html"
        val fragment = i?.data?.fragment
        return if (fragment != null && fragment.startsWith("rutina=")) "$base#$fragment" else base
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val fragment = intent.data?.fragment ?: return
        if (fragment.startsWith("rutina=") && pageReady) webView.evaluateJavascript("location.hash = ${JSONObject.quote("#$fragment")}", null)
        else if (fragment.startsWith("rutina=")) webView.loadUrl(appUrl(intent))
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        WatchBus.detach(this)
        webView.destroy()
        super.onDestroy()
    }

    /** Envía un mensaje a la web: window.__workstationFromNative('<json>'). Seguro desde cualquier hilo. */
    fun sendToWeb(message: JSONObject) {
        val raw = message.toString()
        runOnUiThread { if (pageReady) deliver(raw) else pending.addLast(raw) }
    }

    private fun deliver(raw: String) {
        webView.evaluateJavascript("window.__workstationFromNative && window.__workstationFromNative(${JSONObject.quote(raw)})", null)
    }
}
