plugins {
    id("com.android.application") version "9.4.1" apply false
    // AGP 9 compila Kotlin de serie; el plugin solo fija la versión de Kotlin en el classpath.
    id("org.jetbrains.kotlin.android") version "2.4.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.21" apply false
}
