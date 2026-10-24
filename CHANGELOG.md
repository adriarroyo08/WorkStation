# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).
Las novedades que ve el usuario dentro de la app están en `shared/changelog.ts`.

## [1.3.0] - 2026-10-26

### Corregido (auditoría de Android y Wear OS)
- Móvil: servicio en primer plano durante el entreno (Android ya no congela la app con la pantalla apagada y los comandos del reloj se procesan); el pulso no expulsa comandos de la cola; Atrás cierra hojas y pantallas de la web; sin service worker dentro del APK (servía la versión anterior); `SCHEDULE_EXACT_ALARM` en lugar de `USE_EXACT_ALARM` (política de Google Play); sin pantalla en blanco tras cerrarse el proceso; avisos al abrir la app del reloj.
- Reloj: pulso en un servicio de tipo health (sigue con la muñeca bajada y se para solo al terminar); pasos de 5 lb sobre el valor mostrado; la unidad solo cambia con un estado más nuevo; se ignora un entreno abandonado de hace más de 6 h.
- Sincronización: se mide el desfase del reloj del dispositivo con el servidor y se corrige al fechar los cambios.
- Diseño a 360 px: decimales con coma, rejillas de cifras compactas y etiquetas del gráfico sin recortar.

### Añadido
- Enlaces de rutinas que se abren en la app de Android y menú nativo de compartir.
- e2e de diseño (todas las pantallas a 360 px sin desbordes) y de dispositivo con la hora atrasada.

## [1.2.0] - 2026-10-25

Auditoría completa (entreno en vivo, sincronización, estadísticas e importadores).

### Corregido
- **Pérdida de datos:** reemplazar un ejercicio vaciaba sus series; las series nuevas al editar un entreno pasado se descartaban; "Deshacer" revertía cambios posteriores (y rompía la app tras guardar).
- **Sincronización:** las escrituras de la app no respetaban "gana el más reciente" (migración `003_sync_hardening.sql` con trigger en el servidor); el cursor podía saltarse filas; entrar con otra cuenta mezclaba datos; un móvil nuevo subía ajustes de fábrica que pisaban los del principal; el MCP remoto leía como mucho 1000 filas.
- **Estadísticas:** los ejercicios asistidos contaban la ayuda como peso (volumen, 1RM, récords); 1RM del lastre en ejercicios de peso corporal; semana anterior desplazada con el cambio de hora; la semana en curso contaba como objetivo fallido.
- **Importación de Hevy:** fechas en español, filas ilegibles fechadas "hoy" con ids repetidos, duplicados al reimportar o entre CSV y API, exportaciones en libras.
- **Entreno en vivo:** cronómetro al marcar ✓, descanso en superseries desiguales, descanso al desmarcar, comandos del reloj sobre series que habían cambiado, aviso de datos sin guardar.
- Importar un backup ya no borra notas fijas ni deshace ediciones locales; discos no positivos colgaban la calculadora; API keys con errores sin mensaje rompían Ajustes.

### Añadido
- Tests de las migraciones SQL sobre Postgres real (PGlite) y e2e de sincronización entre dos dispositivos con un Supabase simulado.

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
