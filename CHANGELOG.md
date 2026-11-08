# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).
Las novedades que ve el usuario dentro de la app están en `shared/changelog.ts`.

## [Sin publicar]

### Corregido

- Reduce la espera al ampliar historiales largos, manteniendo todas las sesiones y su contenido accesible (#133).
- Escape cierra las hojas modales desde su primera aparición, incluida la vista previa de Strong (#132).
- Movimiento reducido: duraciones y retardos de 0 ms, también al cambiar de tema; auditoría AA en ambos temas y registro de series por teclado (#126).

### Añadido

- Cronómetro de serie con pausa que no se pierde al recargar, aviso al alcanzar el objetivo, progresión de +5 s según el objetivo de la rutina y tiempos en `mm:ss` o `X s` (#139).
- MCP 0.6.0: `search_articles` y `get_article` consultan la biblioteca propia con evidencia y fuentes; el Coach cita solo los ids recibidos (#57).
- Diez artículos breves con evidencia científica en castellano (#55) en la biblioteca editorial offline: recomendaciones cuantitativas, niveles de evidencia, limitaciones y DOIs comprobados sobre creatina, proteína, volumen, frecuencia, descanso, sueño, déficit, recomposición, cardio y progresión.
- Base de artículos propios en Markdown, validación editorial y biblioteca offline compartida por PWA y MCP (#54); sin pantalla ni cambio de versión.
- Recolector backend de noticias con endpoint JSON en MCP, lista blanca, límites de red y caché por fuente; persistencia propuesta pendiente (#60).
- Parser compartido RSS 2.0, RSS 1.0 y Atom con normalización, extractos limitados, enlaces seguros, deduplicación determinista y fixtures sintéticos offline (#59).
- Escala RPE/RIR opcional en Ajustes para registrar y editar esfuerzo con medios puntos, conservando RPE como dato canónico (#85).
- Noticias científicas e investigación (#58): investigación de fuentes abiertas RSS/Atom y APIs biomédicas (PubMed E-utilities, PLOS ONE, Frontiers, JISSN, Crossref, Fisiología del Ejercicio y Stronger by Science), con análisis legal de derechos de reutilización frente a acceso público, matriz de titular/resumen/enlace, contratos en `shared/news-sources.ts` y fixtures de prueba para el recolector de la app en `docs/investigacion-fuentes-noticias.md`.
- MCP 0.5.0: `update_routine` modifica una rutina guardada (nombre, notas y, por ejercicio, series, repeticiones, peso, duración, descanso, notas, superserie, orden, sustituirlo o quitarlo, y añadir ejercicios) y devuelve cómo queda; `delete_routine` la borra (solo por id o nombre exacto) y devuelve lo borrado. Lógica en `shared/routine-edit.ts`. Las herramientas que escriben llevan ahora `destructiveHint` (verdadero en las que cambian o borran lo que ya había).

## [1.18.0] - 2026-11-08

### Añadido

- Carga total y 1RM estimado con peso corporal histórico en la ficha y el gráfico; ratio informativo de lastre en dominadas y fondos (#130).

## [1.17.0] - 2026-11-08

### Añadido

- MCP 0.7.0: rangos en `create_routine` y `suggest_next`, consulta de solo lectura `check_stagnation` y enlaces compartidos v1 con rangos compatibles con enlaces antiguos (#121).
- Rango objetivo y avisos discretos de rendimiento en el registro, con descarga opcional de series y deshacer (#120).
- Editor de rutinas con rangos de repeticiones por serie, validación y copia a todas las series (#119).
- Sugerencias de doble progresión con rangos de repeticiones, series previstas y esfuerzo; conservan el comportamiento de los objetivos fijos (#115).

## [1.16.0] - 2026-11-08

### Añadido

- Pantalla de noticias desde Entrenar con filtros combinables por fuente y tema, actualización manual y última respuesta válida guardada para lectura offline (#61).

## [1.15.0] - 2026-11-08

### Añadido

- Biblioteca de artículos desde Ejercicios con búsqueda, etiquetas combinables, lectura offline y enlaces relacionados en fichas; muestra fecha, evidencia y referencias (#56).

## [1.14.0] - 2026-11-07

### Añadido

- Importación directa de CSV de Strong en Ajustes con vista previa, unidades explícitas, diagnóstico de fechas y filas inválidas, ejercicios personalizados y backup preventivo (#83).

## [1.13.1] - 2026-11-07

### Corregido

- Búsqueda en inglés de los ejercicios de wger: `scripts/build-catalog.mjs` guarda su nombre en inglés (`en` en `catalog.json`, `nameEn` en `Exercise`) y `matchesExercise` lo usa. `englishName` (`shared/exercisedb.ts`) ya no devuelve las URLs de imagen de wger como nombre.

## [1.13.0] - 2026-11-06

### Añadido

- Evidencia en la ficha (patrón, roles, mapa de intensidad y fuentes), estimaciones identificadas y filtro combinable por patrón en biblioteca y selector (#52).

## [1.12.0] - 2026-11-06

### Añadido

- Catálogo: 154 ejercicios nuevos de wger (CC BY-SA 4.0). Cruce con el catálogo actual en `scripts/wger-map.json` (753 repetidos, 45 duplicados internos y 46 descartados); `scripts/build-catalog.mjs` los añade con id `wger-<id>`, nombre en español, imágenes (`images`) y autor. Pasos a partir de la descripción HTML (`wgerSteps` en `shared/wger.ts`). `mediaUrls` acepta URLs de imagen; el service worker también guarda las imágenes de wger.de.
- Biblioteca: seal row.

## [1.11.1] - 2026-11-06

### Añadido
- Metadatos científicos de la biblioteca (#51): los 130 ejercicios base incorporan su patrón de movimiento, músculos clasificados por rol e intensidad (0–100), nivel de evidencia explícito (hipertrofia, emg o estimada) y fuentes científicas verificadas sin citas inventadas.

### Cambiado

- Búsqueda de ejercicios (`matchesExercise` en `shared/exercises.ts`): también por el nombre original en inglés del catálogo (sale del id de free-exercise-db) y con todas las palabras en cualquier orden.

## [1.11.0] - 2026-11-05

### Añadido

- El selector de ejercicios y la pestaña Ejercicios muestran una sola lista con la biblioteca y los ejercicios del catálogo libre que aún no tienes (`catalogExtras` en `shared/catalog.ts`), en orden alfabético tras recientes o récords. Se pinta por tramos al desplazarse (`useGrowingList`), sin botones. Al elegir uno del catálogo se copia a la biblioteca (`catalogToExercise`).
- Biblioteca: plancha Copenhague, step down y equilibrio monopodal (sin imágenes; no están en el catálogo libre), con su tabla de activación.
- Nombres del catálogo en español (`scripts/catalog-names-es.json`, aplicado por `scripts/build-catalog.mjs`).

## [1.10.0] - 2026-11-03

### Cambiado

- Editor de rutinas: el tipo de serie se elige en un menú (antes cambiaba en ciclo con cada toque). Tipos, letras y nombres comunes en `shared/set-types.ts`, también usados por el entreno en curso.

### Añadido

- Editor de rutinas: mantener pulsado (450 ms) la cabecera de un ejercicio pliega las tarjetas y permite arrastrarlo sin soltar el dedo; un toque normal sigue abriendo la ficha. Cálculo del destino en `shared/reorder.ts`. «Reordenar ejercicios» se mantiene como alternativa con teclado.

## [1.9.0] - 2026-10-31

### Añadido

- Base de evidencia científica para artículos (#53): fichas de investigación y bibliografía contrastada para diez temas clave (creatina, proteína, volumen, frecuencia, descanso entre series, sueño, déficit energético, recomposición corporal, cardio y fuerza, y progresión de cargas) en `docs/investigacion-articulos.md` y `shared/article-research.ts`, con DOIs resueltos, delimitación estricta entre asociación y causalidad y registro explícito de límites y ausencia de evidencia sin citas inventadas.

### Cambiado

- Guías de conexión IA (#41): instrucciones oficiales fechadas para Claude remoto, ChatGPT, Gemini CLI y Claude Code; copia con Authorization e incompatibilidad OAuth de ChatGPT explícita.
- Resumen de fin de entreno (#48): portada de marcador con antetítulo (nº de entreno · rutina), título grande, `SessionMap` y cuatro cifras que suben con `CountUp` (instantáneas con movimiento reducido), y banda de récords del día. La rejilla de 5 cifras y el mapa grande se mantienen solo al consultar un entreno pasado.

- Sistema de diseño (`docs/diseno.md`) aplicado a las pantallas (#44–#47), cada una con su CSS propio importado desde el componente (`Train.css`, `WorkoutLogger.css`, `History.css`, `ExercisesTab.css`, `Profile.css`):
  - Entrenar: tarjetas de rutina con `SessionMap`, nombre en `--display`, series y minutos estimados; cifras de marcador en la cabecera del entreno en curso.
  - Historial: antetítulo de fecha, nombre en `--display`, separadores de mes y calendario con días entrenados rellenos y hoy con borde.
  - Ejercicio: portada con imagen a sangre, chips de músculos encima de las pestañas, cifras de récord sin cajas y mejor serie resaltada en el historial.
  - Perfil: portada con inicial, cifras sin caja separadas por líneas, filas de menú con icono en cuadro y aviso de sincronización tras el menú.

### Seguridad

- Límite por API key (#40): 60 llamadas/minuto y 1000/hora contadas en la base de datos (`008_api_key_rate_limit.sql`, tabla `api_key_usage`, dentro de `api_key_user()`), así que también cubre las RPC llamadas directamente. Responde 429 con `Retry-After`; el MCP lo propaga, corta los lotes al primer 429 y rechaza lotes de más de 20 mensajes. Política y amenazas en `docs/mcp-limites.md`.

### Corregido

- Contraste AA: `--danger-fill` (#c62828) para `button.danger-solid` (antes 3,37:1 en oscuro) y `--muted` oscuro a #9a9aa0 (4,40:1 → ≥ 4,5:1 sobre `--field`).

## [1.8.0] - 2026-10-31

### Añadido

- Ficha rápida del ejercicio (`ExerciseInfo`, en una hoja): imagen/animación, mapa muscular con partes, instrucciones del catálogo, nota fija y mejor marca. Se abre tocando el ejercicio en el editor de rutinas, en Explorar programas, en una rutina compartida y en el entreno en curso (desde ahí, "Ver ficha completa" lleva a la ficha con historial y récords).

### Cambiado

- `loadCatalog` pasa a `app/src/catalog.ts` y reintenta si la primera descarga falla.
- Sin `alert`/`confirm`/`prompt` del navegador: confirmaciones y nombres con diálogos propios (`app/src/dialog.tsx`, `ask.confirm`/`ask.prompt`) y avisos como toast. Los e2e fallan si aparece un diálogo nativo.
- Tipografía de marcador: Barlow Condensed (OFL, `@fontsource`, solo latin 600–800) en `h1`, título del entreno, "Hoy toca" y cifras grandes (`--display`). Ficha rápida con imagen a sangre, título grande y chips de músculos principales/secundarios.
- Instrucciones del catálogo en español (`scripts/catalog-es.json`, que `build-catalog.mjs` aplica si cuadra el número de pasos; se quitan los pasos vacíos). El botón "Traducir con IA" solo sale si siguen en inglés.

### Seguridad

- Migración `007_welcome_revoke.sql`: `notify_welcome()` deja de poder llamarse por RPC (solo la usa el disparador).

## [1.7.0] - 2026-10-29

### Añadido

- API keys: caducidad opcional validada en servidor para lectura y escritura, con fecha y último uso visibles.
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
