# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).
Las novedades que ve el usuario dentro de la app están en `shared/changelog.ts`.

## [1.8.0] - 2026-10-31

### Añadido
- Ficha rápida del ejercicio (`ExerciseInfo`, en una hoja): imagen/animación, mapa muscular con partes, instrucciones del catálogo, nota fija y mejor marca. Se abre tocando el ejercicio en el editor de rutinas, en Explorar programas, en una rutina compartida y en el entreno en curso (desde ahí, "Ver ficha completa" lleva a la ficha con historial y récords).

### Cambiado
- `loadCatalog` pasa a `app/src/catalog.ts` y reintenta si la primera descarga falla.

## [1.7.0] - 2026-10-29

### Añadido
- Historial: cabecera con los entrenos del mes (comparados con el mes pasado hasta el mismo día), volumen, tiempo y series; `SessionMap` en cada fila; mantener pulsado abre Repetir / Borrar (con deshacer).
- Ejercicios: filtro por músculo tocando el cuerpo (`MuscleFilter`), con el número de ejercicios en grande.
- Ficha del ejercicio: valor de la métrica elegida en la última sesión y diferencia en el rango; `LineChart` muestra el punto más cercano al tocar o arrastrar (en todas sus gráficas).

## [1.6.0] - 2026-10-29

### Cambiado
- Entrenar: contador semanal grande y tarjeta "Hoy toca" con `SessionMap` (músculos de la rutina ponderados por series, `sessionMuscles`), series, minutos estimados y botón principal; "Empezar entrenamiento vacío" pasa a secundario cuando hay rutina sugerida.
- Detalle del entreno: mapa muscular por partes. Perfil: cifras más grandes.

### Añadido
- Deslizar una serie a la derecha la marca/desmarca como hecha; mantener pulsada una rutina abre su menú (`useLongPress`); vibración corta al empezar.
- Barra de progreso (series hechas / previstas) bajo la cabecera del entreno en curso.

## [1.5.1] - 2026-10-28

### Añadido
- Activación muscular por ejercicio (`shared/muscle-detail.ts`): los 130 de la biblioteca tienen el % de cada grupo y de cada parte (30 partes: porciones del pectoral, cabezas del deltoides/bíceps/tríceps, dorsal alto/bajo, recto abdominal superior/inferior, vastos, glúteo mayor/medio, gastrocnemio/sóleo…). Los del catálogo con la misma imagen heredan la tabla; el resto, principal 100 % y secundarios 50 %.
- El mapa corporal está dividido en esas partes; en la ficha, tocar un grupo (en la lista o en el mapa) lo resalta y despliega sus partes.

## [1.5.0] - 2026-10-28

### Añadido
- Reloj autónomo: el reloj guarda rutinas, biblioteca, última sesión de cada ejercicio e historial reciente (DataItem `/workstation/library`) y entrena por su cuenta, con la sesión guardada en el reloj.
- Los entrenos del reloj vuelven por Data Layer (`/workstation/workout/<id>`): con la app abierta los guarda la web; con la app cerrada el móvil los sube a la nube con una API key de escritura propia ("Reloj (subida automática)", se borra al cerrar sesión).

## [1.4.4] - 2026-10-27

### Corregido
- Importar de Hevy enlaza sus ejercicios (nombres en inglés) con la biblioteca en vez de crear personalizados sin imágenes; al reimportar, los personalizados ya creados se reenlazan y se borran. 15 ejercicios nuevos en la biblioteca para cubrir los de Hevy.

## [1.4.3] - 2026-10-27

### Corregido
- Android: el selector de ficheros no dejaba elegir el CSV de Hevy (el filtro `.csv` llegaba como tipo MIME inválido).

## [1.4.2] - 2026-10-27

### Añadido
- Importar el CSV de Hevy reconstruye también las rutinas (carpeta "Hevy") desde el último entreno con cada nombre; no toca las rutinas que ya existen con ese nombre.
- Cuenta más visual, registro con Google, política de contraseñas, emails propios (SMTP configurable, Brevo por defecto) y email de bienvenida.
- La API key se puede enviar por email, compartir o añadir a Claude como conector.

## [1.4.0] - 2026-10-27

### Añadido
- Tour de bienvenida en la primera visita (no sale si ya hay datos o vienes de una versión anterior).
- Cuenta con email y con Google (en Android y web) visible en Perfil; ver `docs/google-login.md`.
- Selector de ejercicios a pantalla completa.
- Aviso para activar notificaciones al empezar el primer entreno.

### Cambiado
- Diseño nuevo y más sobrio (fondo #141414, acento naranja plano), en oscuro y claro.
- El Coach pasa a Perfil; la barra inferior queda en 4 pestañas.
- Android: la app respeta las barras de estado y navegación (edge-to-edge).
- Reloj Wear OS con el nuevo acabado.

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
