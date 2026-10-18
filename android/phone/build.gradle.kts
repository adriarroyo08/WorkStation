plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.workstation.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.workstation.app"
        minSdk = 26
        targetSdk = 35
        versionCode = (System.getenv("VERSION_CODE") ?: "3").toInt()
        versionName = System.getenv("VERSION_NAME") ?: "0.3.0"
    }

    signingConfigs {
        // Firma compartida con el reloj: el Data Layer de Wear OS solo conecta apps con el mismo
        // applicationId y la misma firma. Clave de uso personal incluida en el repo privado;
        // para usar la tuya define WS_KEYSTORE / WS_KEYSTORE_PASSWORD / WS_KEY_ALIAS / WS_KEY_PASSWORD.
        create("shared") {
            storeFile = rootProject.file(System.getenv("WS_KEYSTORE") ?: "keystore/workstation.jks")
            storePassword = System.getenv("WS_KEYSTORE_PASSWORD") ?: "workstation"
            keyAlias = System.getenv("WS_KEY_ALIAS") ?: "workstation"
            keyPassword = System.getenv("WS_KEY_PASSWORD") ?: "workstation"
        }
    }

    buildTypes {
        debug { signingConfig = signingConfigs.getByName("shared") }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("shared")
        }
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    // La web (app/dist) se empaqueta dentro del APK y se sirve con WebViewAssetLoader.
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/webassets"))
}

val copyWebApp by tasks.registering(Copy::class) {
    val dist = rootProject.file("../app/dist")
    doFirst {
        if (!dist.exists()) throw GradleException("Falta app/dist: ejecuta antes `npm --prefix app run build`")
    }
    from(dist)
    into(layout.buildDirectory.dir("generated/webassets/www"))
}
tasks.named("preBuild") { dependsOn(copyWebApp) }

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("com.google.android.gms:play-services-wearable:19.0.0")
    implementation("androidx.wear:wear-remote-interactions:1.1.0")
}
