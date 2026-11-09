plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Las publicaciones nunca deben recurrir a las credenciales locales.
val publishedBuild = System.getenv("GITHUB_EVENT_NAME") != "pull_request" &&
    (System.getenv("GITHUB_REF") == "refs/heads/main" ||
        System.getenv("GITHUB_REF")?.startsWith("refs/tags/") == true)
fun signingValue(name: String): String =
    System.getenv(name)?.takeIf { it.isNotBlank() }
        ?: if (publishedBuild) throw GradleException("Falta el secret de firma $name; no se permite publicar con credenciales por defecto.")
        else "workstation"

android {
    // Mismo applicationId y firma que la app del móvil: requisito del Data Layer de Wear OS.
    namespace = "com.workstation.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.workstation.app"
        minSdk = 30
        targetSdk = 35
        versionCode = (System.getenv("VERSION_CODE") ?: "3").toInt()
        // La misma versión que ve el usuario en la app (Novedades), sacada de app/package.json.
        versionName = Regex("\"version\":\\s*\"([^\"]+)\"").find(rootDir.resolve("../app/package.json").readText())!!.groupValues[1]
    }

    signingConfigs {
        // Firma compartida con el reloj: el Data Layer de Wear OS solo conecta apps con el mismo
        // applicationId y la misma firma. La clave NO está en el repo: CI la recibe del secret
        // WS_KEYSTORE_B64 (ver README) y en local se busca en android/keystore/workstation.jks.
        create("shared") {
            storeFile = rootProject.file(System.getenv("WS_KEYSTORE") ?: "keystore/workstation.jks")
            storePassword = signingValue("WS_KEYSTORE_PASSWORD")
            keyAlias = signingValue("WS_KEY_ALIAS")
            keyPassword = signingValue("WS_KEY_PASSWORD")
        }
    }

    buildTypes {
        debug { signingConfig = signingConfigs.getByName("shared") }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("shared")
        }
    }

    buildFeatures { compose = true }
    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.core:core-ktx:1.19.1")
    implementation("androidx.wear.compose:compose-material:1.4.0")
    implementation("androidx.wear.compose:compose-foundation:1.4.0")
    implementation("com.google.android.gms:play-services-wearable:20.0.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
}
