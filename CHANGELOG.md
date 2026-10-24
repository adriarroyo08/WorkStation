# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).
Las novedades que ve el usuario dentro de la app están en `shared/changelog.ts`.

## [1.1.0] - 2026-10-25

### Añadido
- Compartir rutinas por enlace (comprimidas en el propio enlace, ~300 caracteres para 6 ejercicios), con pantalla para guardarlas y validación de enlaces manipulados.

### Rendimiento
- Racha semanal y objetivo en tiempo lineal: con ~1.000 entrenos, Perfil 872 → 164 ms y Entrenar 598 → 105 ms.

## [1.0.0] - 2026-10-24

### Añadido
- Unidades kg/lb en toda la app y en el reloj (los datos se guardan en kg), con saltos de 5 lb y calculadora de discos en libras.
- Aviso de nueva versión con "Actualizar", novedades tras actualizar y versión en Ajustes.
- Copias de seguridad automáticas en el dispositivo (diaria y antes de importar, borrar o restaurar).
- Reordenar ejercicios arrastrando; deslizar una serie para borrarla.
- Niveles de fuerza (Principiante → Élite) y resumen anual en historias para compartir.
- Hoy toca, recuperación muscular y comparación con la sesión anterior.
- Content Security Policy, política de privacidad y de seguridad, guía de contribución y plantillas de issues.

### Cambiado
- Paleta "Energía", accesibilidad WCAG 2.1 AA y carga diferida (Lighthouse: rendimiento 97-99, resto 100).
- Android: AGP 9, Kotlin 2.4, Gradle 9.8 y compileSdk 37.

### Corregido
- Escribir "82,5" en un peso guardaba 825: ahora se aceptan decimales con coma o punto.

## [0.2.0] - 2026-10-19

### Añadido
- Cuenta y sincronización con Supabase, API keys personales y servidor MCP remoto.
- GIFs de ExerciseDB y animaciones propias de los ejercicios.
- App Android y Wear OS, vídeo promocional con Remotion.
