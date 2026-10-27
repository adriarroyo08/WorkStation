plugins {
    id("com.android.application")
}

android {
    namespace = "com.workstation.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.workstation.app"
        minSdk = 26
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

    // La web (app/dist) se empaqueta dentro del APK y se sirve con WebViewAssetLoader.
    sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/webassets").get().asFile)
}

val copyWebApp = tasks.register<Copy>("copyWebApp") {
    val dist = rootProject.file("../app/dist")
    doFirst {
        if (!dist.exists()) throw GradleException("Falta app/dist: ejecuta antes `npm --prefix app run build`")
    }
    from(dist)
    into(layout.buildDirectory.dir("generated/webassets/www"))
}
tasks.named("preBuild") { dependsOn(copyWebApp) }

dependencies {
    implementation("androidx.core:core-ktx:1.19.1")
    implementation("androidx.appcompat:appcompat:1.8.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("com.google.android.gms:play-services-wearable:20.0.1")
    implementation("androidx.wear:wear-remote-interactions:1.1.0")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
}
