# Sistema de diseño de Workstation

Referencia común para las pantallas de la app (`app/`). Todo lo que se cita aquí existe en `app/src/styles.css`
(el bloque `:root` del principio y el bloque «Tipografía de marcador» del final son las fuentes de verdad),
`app/src/components/ui.tsx`, `app/src/dialog.tsx` y `app/src/toast.ts`. Si cambias un token o una clase, cambia también este documento.

## 1. Principios

1. **Oscuro + un único acento naranja plano** (`#f2600c`). Sin degradados, brillos, sombras de color ni emojis. Lo vigila `e2e/style.spec.ts`.
2. **Las cifras mandan.** La jerarquía se consigue con tamaño y peso (cifras grandes en condensada), no con color ni adornos.
3. **Gestos antes que botones**: deslizar una serie a la derecha la marca hecha, a la izquierda la borra; mantener pulsado abre el menú. Todo gesto tiene también una alternativa con botón o teclado.
4. **El movimiento responde a una acción** (abrir una hoja, marcar una serie, un récord). Nunca decora, y se apaga con `prefers-reduced-motion`.
5. **Filas con divisores mejor que tarjetas.** Nada de tarjetas dentro de tarjetas.
6. **El mapa muscular por partes es la seña de identidad** (`BodyMap.tsx`): se reutiliza antes que inventar ilustraciones.
7. **Accesible por defecto**: contraste AA en claro y oscuro, foco visible, objetivos táctiles de 40-48 px, 360 px de ancho sin desbordes.

### Relación con la spec de «acabado profesional»

`docs/superpowers/specs/2026-10-24-acabado-profesional-design.md` (opción C, «Oscuro + naranja plano») sigue siendo el marco de producto.

| Decisión de la spec | Estado |
|---|---|
| Fondo `#141414`, superficies `#1f1f1f`, divisores `#2a2a2a`, texto `#f2f2f2`, secundario `#8e8e93`, acento `#f2600c` | Vigente tal cual (`--bg`, `--surface`, `--line`, `--text`, `--muted`, `--accent`). |
| Claro/oscuro automático más ajuste manual | Vigente (`prefers-color-scheme` y `:root[data-theme]`). |
| Sin degradados, brillos, emojis; solo iconos lucide | Vigente y con test. Única excepción: el degradado del `.skeleton` (carga), que el test omite expresamente. |
| Filas con divisores en lugar de tarjetas grandes | Vigente (`.line`, `.lines`). |
| El naranja solo en acción principal, pestaña activa, progreso y enlaces | Vigente. Se añade: relleno `--accent-fill` para texto blanco y texto `--accent-ink` (ver 2). |
| Tipografía solo Inter, título ~22-24 px, cifras con peso medio | **Evolucionada** (1.8.0): Inter para texto, pero títulos y cifras en Barlow Condensed (`--display`), h1 de 34 px en mayúsculas, cifras de 30-60 px con peso 700-800. |
| Radios ≈8 px botones, ≈10-12 px tarjetas | Parcial: botones e inputs 10 px, tarjetas 12 px (`--radius`), `--radius-sm` 8 px para controles con borde. |
| Anillo de progreso → 7 casillas de la semana | Vigente (`WeekStrip`, `.weekstrip-days`). |
| Sin cuenta obligatoria, tour, 4 pestañas | Producto, sin cambios. |
| Mapa muscular, gestos, movimiento que responde, diálogos y hojas propios | **Nuevo** desde la spec; se documenta aquí. |

## 2. Color

Tres bloques definen los mismos nombres: `:root` (oscuro, por defecto), `@media (prefers-color-scheme: light)` con
`:root:not([data-theme='dark'])` y `:root[data-theme='light']` (idénticos entre sí). Los dos bloques claros no redefinen `--on-accent` (vale `#ffffff` del `:root`); en oscuro `--warn-ink` es `var(--warn)`.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--bg` | `#141414` | `#ffffff` | Fondo de la app, barra de pestañas, `.sticky`, campos de texto |
| `--surface` | `#1f1f1f` | `#f4f4f6` | `.card`, `.stat`, `.item`, `.segmented`, fondo de campo enfocado |
| `--field` | `#2a2a2a` | `#ececec` | Inputs dentro de series, chips inactivos, base del skeleton |
| `--line` | `#2a2a2a` | `#ececec` | Divisores, bordes de tarjeta, fondo de botón neutro, casillas vacías |
| `--line-strong` | `#3a3a3a` | `#dcdce0` | Borde de `.outline`, tirador de hoja, hover de tarjeta |
| `--text` | `#f2f2f2` | `#111111` | Texto principal; fondo del toast |
| `--muted` | `#8e8e93` | `#6b6b70` | Texto secundario, etiquetas `.sec`, iconos de fila |
| `--accent` | `#f2600c` | `#f2600c` | Solo elementos no textuales: barras, casillas activas, anillo de foco, relleno de mapa muscular |
| `--accent-ink` | `#ff7a2e` | `#b23a08` | Texto de acento: enlaces, `button.ghost`, `button.link`, borde de campo enfocado |
| `--accent-fill` | `#c2410c` | `#c2410c` | Relleno con texto blanco: `button.primary`, chip/segmento activo, banner de entreno, descanso |
| `--on-accent` | `#ffffff` | (hereda `#ffffff`) | Texto sobre `--accent-fill` |
| `--ok` / `--ok-ink` | `#30a46c` / `#4cc38a` | `#30a46c` / `#1f7a4d` | Relleno de éxito / texto de éxito (`.delta.up`) |
| `--on-ok` | `#04140b` | `#04140b` | Texto sobre relleno `--ok` |
| `--warn` / `--warn-ink` | `#d9a441` / `var(--warn)` | `#b7791f` / `#92400e` | Relleno de aviso / texto (`.chip.warm`) |
| `--danger` | `#f2555a` | `#c53030` | Texto y rellenos destructivos (`button.danger`, `.error`, `.delta.down`, `button.danger-solid`) |

Regla práctica: **el texto nunca usa `--accent`**, usa `--accent-ink`; **el texto blanco nunca va sobre `--accent`**, va sobre `--accent-fill`.

### Contraste (WCAG, calculado con la fórmula de luminancia relativa)

Mínimos: 4,5:1 texto normal, 3:1 texto grande (≥24 px, o ≥18,66 px en negrita) y componentes gráficos.

| Combinación | Oscuro | Claro | Veredicto |
|---|---|---|---|
| `--text` sobre `--bg` | 16,46 | 18,88 | AA |
| `--text` sobre `--surface` | 14,72 | — | AA |
| `--muted` sobre `--bg` | 5,65 | 5,30 | AA |
| `--muted` sobre `--surface` | 5,06 | 4,83 | AA |
| `--muted` sobre `--field` | **4,40** | 4,49 | **No llega a 4,5**: no pongas texto `--muted` pequeño sobre `--field` (chips inactivos); usar `--text` o tamaño grande |
| `--accent-ink` sobre `--bg` / `--surface` | 7,08 / 6,34 | 6,00 / 5,46 | AA |
| `--on-accent` sobre `--accent-fill` | 5,18 | 5,18 | AA (mismo valor en ambos temas) |
| `--accent` sobre `--bg` (no texto) | 5,66 | **3,25** | AA para gráficos y foco (≥3:1); **prohibido como color de texto en claro** |
| `--danger` sobre `--bg` / `--surface` | 5,46 / 4,88 | 5,47 / 4,98 | AA como texto |
| `#fff` sobre `--danger` (`.danger-solid`) | **3,37** | 5,47 | **Falla en oscuro** (ver «Incoherencias») |
| `--ok-ink` sobre `--bg` | 8,32 | 5,32 | AA |
| `--warn-ink` sobre `--bg` | 8,19 | 7,09 | AA |
| `--on-ok` sobre `--ok` | 5,99 | 5,99 | AA |
| `--line-strong` sobre `--bg` (borde de control) | 1,62 | 1,37 | Decorativo; no es el único indicador de estado |

## 3. Tipografía

- **Texto**: `'Inter Variable'` con `system-ui` de reserva; `body` 15 px / 1.5, `font-feature-settings: 'cv11', 'ss01'`.
- **Marcador (`--display`)**: `'Barlow Condensed'` (pesos 600/700/800) con Inter y `system-ui` de reserva. Se aplica con `letter-spacing: 0` y `tnum` (cifras tabulares).

| Rol | Selector | Tamaño / peso | Notas |
|---|---|---|---|
| Título de pantalla | `h1` | 34 px / 800, mayúsculas, `line-height: 1`, `--display` | margen `8px 0 16px` |
| Título del entreno | `input.title` | 30 px / 800, mayúsculas, `--display` | sin borde ni fondo |
| «Hoy toca» | `.today-info h3` | 30 px / 800, mayúsculas, `--display` | |
| Título de ficha rápida | `.exinfo-title` | 34 px / 800, mayúsculas, `--display` | |
| Cifra de la semana / músculo | `.week-count`, `.mfilter-info b` | 60 px / 800, `line-height: .9` | la mayor del sistema |
| Cifra de métrica | `.metric-head > b` | 50 px / 800 | |
| Frecuencia cardíaca, marcador de reloj | `.hr-big` 40 px, `.w-row b` 38 px | `--display` | |
| Estadística | `.stat b` | 30 px / 700 (`.stats.four`: 26 px; ≤380 px: 22 px) | usa `<Stat>` |
| Subtítulo | `h2` | 17 px / 700, margen `22px 0 8px` | `.empty-state h2` 18 px |
| Título de fila / tarjeta | `h3`, `.line h3` | 15 px / 700 | |
| Etiqueta de sección | `.sec` | 12 px / 600, mayúsculas, `letter-spacing: .04em`, `--muted` | |
| Cuerpo | `body` | 15 px / 400 | |
| Pequeño | `.small` 13 px, `label` 13 px, `.stat small` 12 px, `.delta` 12 px | | secundarios en `--muted` |
| Pestañas | `.tabs button` | 11 px / 600 | |

**Cuándo usar `--display`**: títulos de pantalla (h1) y títulos «de marcador» en mayúsculas, y cifras que son el protagonista del bloque
(más de 28 px). **No** para párrafos, etiquetas, botones, filas de lista ni cifras pequeñas dentro de texto corrido: ahí va Inter.
Para añadir un elemento nuevo, añade su selector a la lista del bloque «Tipografía de marcador» (comparten familia y `tnum`) y fija tamaño y peso allí.

## 4. Espaciado, radios y sombras

**Espaciado** (no hay tokens; son valores recurrentes, múltiplos de 2):

| Valor | Dónde |
|---|---|
| 16 px | Padding horizontal de `main` (`12px 16px` + 104 px inferiores y `safe-area-inset-bottom` por la barra de pestañas); margen negativo `-16px` de `.sticky` y de la imagen de `.exinfo .media.large` |
| 12-14 px | Padding de `.card` (`12px 14px`), de `.line` (`12px 0`) |
| 10 px | Margen vertical de `.card`, gap de `.line` |
| 8 px | Gap de `.stats`, margen de `.list`/`.chips`/`.segmented`, margen de `button.full` |
| 6 px | Gap de `.list`, `.chips`, casillas de semana |

**Radios**: `--radius` 12 px (tarjetas, `.stat`, `button.big`, toast); `--radius-sm` 8 px (`button.outline`, casillas de semana);
10 px literal en `button`, `input/select/textarea`, `.segmented`, `.set`, `.swipe`; `99px` en `.chip`, chips de músculos y tirador de la hoja; 4 px en `code`.

**Sombras**: `--shadow: none` en ambos temas (el estilo es plano; `.media` y `.excard` la consumen y no pintan nada).
`--shadow-lg` (`0 8px 24px` negro al 35 % oscuro, 15 % claro) solo para lo que flota: `.sheet`, `.active-banner`, `.rest`.
El toast usa una sombra literal (`0 6px 24px rgba(0,0,0,.3)`). Las sombras deben ser negras o grises: `style.spec.ts` rechaza cualquier sombra con color.

**Objetivos táctiles**: 40 px mínimo en controles densos, 44-48 px en botones principales y de diálogo (`.ask-actions button` 48 px).

## 5. Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Entradas y transiciones generales |
| `--spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Rebote corto: icono de pestaña activa, `pop` |
| `--dur` | `240ms` | Cambios de color/borde/transform de componentes |

| Keyframes | Duración | Dónde |
|---|---|---|
| `screen-in` | 0.32 s `--ease` | Cada `main > section`: fundido + subida de 10 px. Sin `forwards` a propósito (un transform retenido rompería los `position: fixed`) |
| `fade-in` | 0.2 s | Fondo `.modal` |
| `sheet-in` | 0.34 s `--ease` | `.sheet` sube desde abajo |
| `rise-in` | 0.36 s `--ease` | Hijos de `.list` y `.badges`, escalonados 30 ms hasta el 5.º |
| `pop` | 0.38-0.5 s `--spring` | `.pr-badge`, casilla de serie hecha |
| `check-pop` | 0.2 s `--ease` | Casilla de serie hecha (solo con `no-preference`) |
| `toast-in` | 0.2 s | Toast |
| `shimmer` | 1.2 s infinito | `.skeleton` |
| `pulse`, `spin`, `w-run`, `w-in`, `sa-flow`, `auth-pop` | — | Indicadores propios de reloj, sincronización y cuenta |

**`prefers-reduced-motion: reduce`** (regla global en `styles.css`): todas las animaciones y transiciones quedan en `0.01ms` y una sola iteración
(`*, *::before, *::after`, con `!important`). Reglas para código nuevo:

- No dependas de que una animación termine para mostrar un estado: el resultado debe verse igual con movimiento reducido.
- Las animaciones decorativas nuevas van dentro de `@media (prefers-reduced-motion: no-preference)` (como `check-pop`).
- Nada parpadea más de 3 veces por segundo; ninguna animación en bucle salvo el skeleton de carga.
- `haptic()` (`ui.tsx`) acompaña a los gestos; es opcional y silencioso si el dispositivo no vibra.

## 6. Componentes y primitivas

### Botones (`button` base: fondo `--line`, 10 px, padding `9px 14px`)

| Clase | Aspecto | Cuándo |
|---|---|---|
| `.primary` | Relleno `--accent-fill`, texto blanco, 600 | **Una** acción principal por pantalla u hoja |
| `.outline` | Borde `--line-strong`, fondo nulo, 14 px / 600 | Acción secundaria de bloque («Nueva rutina», «Explorar») |
| `.ghost` | Sin fondo, texto `--accent-ink` | Acciones terciarias, cerrar hoja (icono solo), «Deshacer» |
| `.link` | Sin fondo, `--accent-ink`, 600 | Enlace de acción dentro de una fila o texto |
| `.danger` | Sin fondo, texto `--danger` | Acción destructiva reversible o con confirmación aparte |
| `.danger-solid` | Fondo `--danger`, texto `#fff` | Confirmación final destructiva (botón OK de `ask.confirm({ danger: true })`) |
| `.plain` | Sin fondo ni padding, hereda color | Envolver contenido pulsable propio |
| `.big` | Ancho completo, 17 px, radio `--radius` | CTA de pantalla («Empezar entrenamiento») |
| `.small` | `4px 8px`, 13 px | Controles en línea densos |
| `.full` | Bloque de ancho completo | Combinable con las demás; con icono, `.full.icon-btn` |
| `.icon-btn` | `inline-flex` con hueco de 6 px | Botón con icono lucide; si solo lleva icono, ponle `aria-label` |

Estados: `:active` baja ligeramente; `:disabled` pasa a `opacity: .4` (ver 7). Los iconos son siempre lucide, nunca emojis.

### Contenedores y listas

| Primitiva | Qué es | Cuándo |
|---|---|---|
| `.line` | Fila plana con divisor inferior, icono `.tile-ico` + `h3` + `small`/`p`, ancho completo | **Por defecto** para rutinas, historial, ejercicios, ajustes. Agrupar en `.lines` |
| `.card` | Superficie `--surface`, borde, 12 px | Bloque autónomo con datos propios (resumen, formulario). Nunca dentro de otra `.card` |
| `.item` / `.tile` | Elemento de `.list` (pulsable) / tarjeta pulsable con hover de elevación | Listas de elección, accesos rápidos |
| `.list` | Columna con gap de 6 px y entrada escalonada `rise-in` | Contenedor de `.item`; `.list.flush` quita el padding lateral |
| `.chips` | Botones-píldora (`.chips.small`, `.chips.scroll`); `.on` = `--accent-fill` | Filtros multiopción o de un solo valor |
| `.chip` | Etiqueta no interactiva de 12 px; `.chip.warm` para aviso | Metadatos (equipo, dificultad) |
| `.segmented` (`.small`, `.fit`, `.mini`) | Control de pestañas de 2-4 opciones; `.on` = `--accent-fill` | Cambiar de vista dentro de una pantalla; `.fit` si no caben en una línea (mín. 40 px de alto) |
| `.stats` (`.four`, `.five`) / `<Stat value label extra>` | Rejilla de 3 (4/5) cifras con etiqueta; formatea números en `es-ES` | Resumen numérico de 3-5 valores. Usa el componente, no HTML a mano |
| `.sec` y `.sec-row` | Etiqueta de sección en mayúsculas, con acciones opcionales a la derecha | Cabecera de cada grupo de filas |
| `.empty-state` | Centrado, `h2` + `p` (máx. 300 px) + acción | Pantalla o lista sin datos |
| `.skeleton` | Bloque de carga con shimmer | Mientras carga un chunk perezoso (ver 7) |

Otros componentes de `ui.tsx`: `Delta` (variación con `.delta.up/.down`), `BarChart`, `HBars`, `MonthCalendar`, `WeekStrip`, `PrList`, `Toggle`,
`NumberField`/`WeightField`, `useLongPress` (mantener pulsado), `useScrollTop`, `haptic`.

### Hojas, diálogos y avisos

| Primitiva | API | Cuándo |
|---|---|---|
| `Sheet` (`ui.tsx`) | `{ title, onClose, full?, header?, footer? }`; portal a `body`; `role="dialog" aria-modal`; Escape cierra solo la superior | Contenido que necesita contexto sin salir de la pantalla. `full`: pantalla completa con cabecera y pie fijos y cuerpo con scroll propio |
| `ask.confirm(texto, { title, ok, danger })` | `Promise<boolean>` | Confirmar acciones destructivas o irreversibles |
| `ask.prompt(texto, inicial, { title, ok, placeholder })` | `Promise<string \| null>` | Pedir un nombre o un número corto |
| `ask.notice(texto)` / `ask.error(texto)` | Toast de 4,5 s / 7 s | Avisos sin respuesta / errores visibles. No bloquean |
| `toast.show(texto, acción?, ms)` / `toast.undo(texto, run)` | Toast de 4 s / 6 s con «Deshacer» | Confirmar una acción ya hecha y reversible. **Preferir deshacer a confirmar** |

**Nunca** uses `alert`, `confirm` ni `prompt` del navegador. Los diálogos propios van montados en `DialogHost`.

### Otros

- `Back` (`ui.tsx`): `{ onClick, label = 'Volver', right? }`. Cabecera de pantallas secundarias.
- `ExerciseMedia`: `{ exercise?, media?, exdbId?, size: 'thumb' | 'large' }`. Imagen/animación del ejercicio; `.media.large` va a sangre en la ficha rápida.
- **Mapa muscular** (`BodyMap.tsx`, datos en `shared/muscle-detail.ts`): `BodyMap` (por series y fatiga), `MuscleMap` (músculos de un ejercicio), `SessionMap` (resumen del entreno; `big`), `MuscleThumb` (miniatura en filas), `MuscleFilter` (selector). El relleno usa `--accent`.
- Gestos de serie: `.swipe` + `.swipe-bg` (derecha = hecha, izquierda = borrar), `useLongPress` para el menú.

## 7. Estados

| Estado | Regla |
|---|---|
| **Foco** | `button:focus-visible, a:focus-visible`: `outline: 2px solid var(--accent)` con `outline-offset: 2px` (5,66:1 en oscuro, 3,25:1 en claro, ambos ≥ 3:1). Inputs: `outline: none` pero `border-color: var(--accent-ink)` y fondo `--surface`. Nunca quites el foco sin sustituto visible; los elementos nuevos que no sean `button`/`a` (p. ej. un `div` con `role="button"`) necesitan su propio `:focus-visible` |
| **Error** | Texto en `--danger` (`.error`), junto al campo, con mensaje accionable en español. Errores globales con `ask.error`. No dependas solo del color: añade icono o texto («No se pudo guardar») |
| **Vacío** | `.empty-state`: título corto + una frase + la acción que lo resuelve. Sin emojis ni ilustraciones decorativas (usar icono lucide o el mapa muscular si aporta) |
| **Carga** | `.skeleton` (120 px de alto, `--radius`, shimmer) como `fallback` de `Suspense` (`App.tsx` y `Train.tsx`). Reproduce la forma del contenido final para evitar saltos. El shimmer se detiene con movimiento reducido |
| **Deshabilitado** | `button:disabled`: `opacity: .4`, `cursor: default`, sin `:hover`/`:active`. Explica por qué en texto cercano si no es evidente |
| **Seleccionado** | `.on`: relleno `--accent-fill` en chips/segmentos; `.tile.on` con borde `--accent-ink`; pestaña con píldora de acento al 16 % |
| **Hecho** | `.set.done` con `.check` (animación `check-pop`); fila de serie con fondo propio |

## 8. Patrones para las pantallas #44-#48

Cada pantalla compone los mismos patrones; no inventes variantes nuevas.

| Issue | Pantalla | Patrones que consume |
|---|---|---|
| #44 | **Entrenar** | `h1` en mayúsculas; `.week-count` (cifra grande) con `WeekStrip` de 7 casillas; «Hoy toca» (`.today-info h3`) con `button.today-go`; botón `.primary.big` «Empezar entrenamiento vacío»; `.outline` para «Nueva rutina» y «Explorar»; rutinas como filas `.line` bajo `.sec`; `BodyMap` de fatiga/recuperación que abre una `Sheet` |
| #45 | **Historial** | Filtros con `.chips`/`.segmented`; `MonthCalendar`; sesiones como filas `.line` con `MuscleThumb`/`SessionMap` pequeño y `.small` con fecha, duración y volumen; `.stats` de totales; vacío con `.empty-state` |
| #46 | **Ejercicio** (catálogo y ficha) | `MuscleFilter` + `.chips` de equipo; filas `.line` con `ExerciseMedia size="thumb"` y `MuscleThumb`; ficha rápida en `Sheet` con imagen a sangre, `.exinfo-title`, `.exinfo-chips` (el músculo principal en `--accent-fill`) y `MuscleMap`; `.metric-head > b` + `BarChart` para progresión; PR con `PrList` |
| #47 | **Perfil** | `.stats` (`Stat`, 3-5 cifras) como cabecera; ajustes como `.lines` de filas `.line` con `Toggle` y `.segmented` para tema/unidades; Coach, cuenta y sincronización como filas que abren pantalla secundaria con `Back`; `ask.confirm({ danger: true })` para cerrar sesión o borrar datos; `.danger` para acciones destructivas |
| #48 | **Resumen de fin de entreno** | Título `--display` y `.stats` con duración, volumen y series (`Stat`); `SessionMap` `big` como protagonista; `PrList` con `.pr-badge` (`pop`); `Delta` frente al entreno anterior; un único `.primary` para terminar; `toast.undo` si se descarta |

Reglas comunes:

- **Cifra grande + etiqueta**: valor en `--display` (clase existente o nuevo selector en el bloque de marcador) y etiqueta `.small`/`small` en `--muted` debajo.
- **Un solo `.primary` visible** por pantalla u hoja. El resto, `.outline`, `.ghost` o `.link`.
- **Gestos con alternativa**: cualquier acción por deslizar o mantener pulsado debe existir como botón o entrada de menú accesible por teclado.
- **Hojas** para detalle y edición contextual; **pantalla con `Back`** para flujos largos. Las hojas se cierran con Escape y el Atrás de Android.
- **Movimiento mínimo**: `screen-in` ya se aplica a las secciones de `main`; no añadas animaciones de entrada propias.

## 9. Checklist de verificación

Antes de abrir PR de cualquier cambio visual:

- [ ] `npm run check` sin errores; `npm --prefix app run build && npm run e2e` en verde.
- [ ] **360 px sin desbordes** (`e2e/layout.spec.ts`, viewport 360×740, claro y oscuro, pantallas principales y secundarias). Si añades una pantalla o hoja, añádela al test. Cifras largas: `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`.
- [ ] **Axe claro/oscuro** (`e2e/a11y.spec.ts`, etiquetas `wcag2a`, `wcag2aa`, `wcag21aa`) sin violaciones.
- [ ] **Estilo** (`e2e/style.spec.ts`): sin `gradient` (salvo `.skeleton`), sin `backdrop-filter`, sin `url()` en fill/stroke, sin sombras con color, sin emojis en el texto de la interfaz.
- [ ] **Zoom 200 %** (o fuente del sistema al máximo): sin texto cortado ni controles tapados por la barra de pestañas o por el toast; el contenido sigue accesible con scroll.
- [ ] **Teclado**: todo es alcanzable con Tab en orden lógico, el foco siempre se ve, Escape cierra hojas y diálogos, y los gestos tienen alternativa.
- [ ] **Movimiento reducido**: activar `prefers-reduced-motion: reduce` y comprobar que ningún estado depende de una animación.
- [ ] Tokens, no valores sueltos: colores con `var(--…)`; texto de acento con `--accent-ink`; texto blanco solo sobre `--accent-fill`.
- [ ] Cambio visible: entrada en `shared/changelog.ts` y `CHANGELOG.md`; este documento actualizado si tocas un token o una primitiva.

## 10. Incoherencias detectadas (candidatas a consolidar)

No se han corregido aquí (esta tarea es solo documentación):

1. **Reglas duplicadas que se pisan** en `styles.css`: `.stat b` aparece 4 veces (tamaños 19 → 24 → 30 px; gana la última, en el bloque de marcador), `.week-count` y `.mfilter-info b` 2-3 veces (40 → 60 px), `.metric-head > b` (36 → 50 px), `h1` (24 → 34 px), `input.title` (21 → 30 px), además de `.card`, `.tabs`, `.chips`, `.segmented.mini`, `button.primary` y `.big-emoji` definidos más de una vez. Consolidar en una sola regla por selector.
2. **`.danger-solid` en oscuro**: texto `#fff` sobre `--danger` `#f2555a` da 3,37:1, por debajo de AA. En claro cumple (5,47). Sugerencia: añadir `--on-danger` (oscuro `#140404`) o usar un `--danger-fill` propio.
3. **`--muted` sobre `--field` en oscuro** da 4,40:1 (claro 4,49:1), justo bajo AA para texto pequeño (chips inactivos).
4. **`--on-accent` solo se define en `:root`**; los bloques claros lo heredan. Funciona, pero conviene declararlo también ahí por simetría.
5. **Radios literales** (10 px en `button`/`input`/`.set`/`.swipe`, 12 px en `.toast`) conviviendo con `--radius` y `--radius-sm`. Falta un token de 10 px o unificar con `--radius-sm`.
6. **Sombra del toast literal** en lugar de `--shadow-lg`; `--shadow` es `none` y se consume en `.media`/`.excard` sin efecto.
7. **Bordes de control con bajo contraste** (`--line` / `--line-strong` frente a `--bg`: 1,4-1,6:1). No son el único indicador de estado, pero un input vacío casi no se distingue en claro.
8. **Foco de inputs** más débil que el de botones (solo borde de 1 px en `--accent-ink`, sin anillo de 2 px).
9. **`.stats.five`** lleva un `outline` de acento fijo en su propia regla. Revisar si es intencionado.
