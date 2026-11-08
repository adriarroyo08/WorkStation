# Rendimiento de referencia

La tabla inicial se conserva como referencia de #127. La comparación y el perfil de #133 figuran al final del documento.

## Método

Ejecutar `npm --prefix app run build && npm run perf` (Node >= 22; instalar Chromium una vez con `npx playwright install chromium`, o indicar `PW_CHROMIUM`). No forma parte de `npm run check`. `PERF_REPETITIONS` permite aumentar las repeticiones, nunca bajarlas de cinco.

Build de producción servido en loopback por Vite preview, Chromium headless, perfil Pixel 7 (412 × 839 CSS px, DPR 2.625), es-ES, Europe/Madrid, sin limitación artificial de CPU/red. Es emulación de viewport, no rendimiento de un teléfono físico. Cada repetición arranca otro navegador y contexto sin caché HTTP ni service worker: arranque frío de recursos con datos locales existentes. El generador determinista shared/perf-data.ts crea 104 semanas desde 2024-11-04: 416 entrenamientos, 6 ejercicios y 4 series completadas por sesión (9984 series), pesos en kg con progresión, 4 rutinas y 104 medidas de peso. La biblioteca base se normaliza por la PWA. No depende de la fecha actual para generar datos; los resúmenes de la interfaz sí dependen de ella.

Los datos se insertan en IndexedDB keyval-store/keyval, clave data, en una página vacía; se transfieren a un contexto nuevo antes de abrir la app. Tour y novedades se marcan vistos. Sin cuenta ni configuración de nube; se aborta toda petición fuera del origen local, incluso Supabase (30 solicitudes externas bloqueadas en esta ejecución). No se reutiliza ni modifica el perfil personal.

Arranque: desde navigationStart hasta que Playwright verifica que el botón de entreno vacío acepta interacción (trial) y pasan dos requestAnimationFrame; incluye el pequeño coste de automatización. Es una definición operacional de disponibilidad, no el antiguo TTI de Lighthouse. Pestañas: click DOM en el navegador, contenido propio visible y dos RAF, en orden Historial → Ejercicios → Perfil → Entrenar; primera visita incluye chunks lazy. Reapertura mide Historial de nuevo. Carga completa: 13 clicks reales en Ver más hasta verificar 416 filas, incluye automatización y autoscroll del botón. Scroll: desde arriba hasta abajo, pasos del 80% del viewport por RAF, sin pausas humanas; se informa duración y peor intervalo entre fotogramas. No es una medida de FPS durante gestos táctiles reales.

## Máquina

- Fecha UTC: 2026-11-08T20:43:58.215Z
- Sistema: Windows_NT 10.0.26300 (x64)
- CPU: Intel(R) Core(TM) i9-14900HX; 32 procesadores lógicos
- RAM: 31.7 GiB
- Node: v22.17.0; Chromium: 156.0.8078.4
- Commit fuente: c3e20ae541b2fc88266a2ed2b1a506615dca9a27; app 1.18.0
- Sin aislamiento de carga del sistema; comparar en la misma máquina y condiciones.

## Resultados de referencia

Mediana de 5 repeticiones secuenciales; todos los tiempos en ms. Muestras conservadas para ver dispersión.

| Operación                                     | Mediana (ms) | Muestras (ms)                           |
| --------------------------------------------- | -----------: | --------------------------------------- |
| Arranque frío hasta control interactuable     |        309.6 | 274.3, 310.7, 309.6, 291.8, 320.4       |
| Pestaña Historial (primera visita)            |        362.4 | 347.5, 363.8, 362.4, 346.5, 363.3       |
| Pestaña Ejercicios (primera visita)           |        149.2 | 149.2, 115.1, 366.4, 114.7, 351.1       |
| Pestaña Perfil (primera visita)               |        226.7 | 226.7, 238.3, 163, 150.3, 346.9         |
| Pestaña Entrenar (primera visita)             |         47.0 | 47, 47.5, 46.7, 47.8, 43.7              |
| Reapertura del historial                      |         50.3 | 47.8, 48.2, 52.7, 50.7, 50.3            |
| Cargar historial completo (13 ampliaciones)   |      16533.8 | 15780.7, 18182, 16533.8, 14735.8, 19814 |
| Historial (ampliación más lenta)              |       2449.7 | 1846.4, 2625, 2449.7, 1929.5, 2578.3    |
| Scroll completo (duración del recorrido)      |       4652.7 | 4652.7, 5770, 5009.8, 3863.7, 4300.3    |
| Scroll completo (peor intervalo de fotograma) |        283.3 | 250.1, 950, 416.6, 250, 283.3           |

## Cuellos de botella

- Historial (ampliación más lenta): mediana 2449.7 ms (> 1 s); requiere investigación independiente, sin corregir aquí.

El tiempo acumulado de 13 ampliaciones y la duración del recorrido no equivalen a una pausa individual: dependen del número de acciones y fotogramas. Revisar además las muestras y el peor intervalo de fotograma al comparar en beta. Este ensayo no atribuye causas sin un perfil de CPU. Las incidencias de seguimiento de la referencia inicial se documentan en docs/rendimiento-seguimiento.md.

## #133: perfil y comparación del historial

Medido el 2026-11-08 en la misma máquina y con las mismas condiciones descritas arriba: Windows 10.0.26300, i9-14900HX, 31,7 GiB, Node 22.17.0, Chromium 156.0.8078.4 headless y Pixel 7. Se integró `origin/feat/medir-rendimiento` mediante merge desde `origin/main`. Antes: código de `1339ac8`; después: `ac33ad3`. Cada serie siguiente contiene cinco navegadores/contextos nuevos, sin ejecutar comprobaciones o builds en paralelo. Se mantuvieron los 13 clicks de Playwright, su autoscroll, dos RAF y la comprobación de las 416 filas; no se cambió el selector para mejorar artificialmente la medida.

| Operación                                 | Mediana antes (ms) | Cinco muestras antes (ms)                   | Mediana después, primera serie (ms) | Cinco muestras después (ms)             |
| ----------------------------------------- | -----------------: | ------------------------------------------- | ----------------------------------: | --------------------------------------- |
| Ampliación más lenta                      |             1945.2 | 1989.9, 1911.8, 1945.2, 1822.2, 2256.5      |                               456.4 | 499.1, 476, 449.1, 455.5, 456.4         |
| Cargar las 416 sesiones (13 ampliaciones) |            15162.5 | 17059.9, 15015.4, 15162.5, 14799.3, 17400.2 |                              2904.5 | 3507.8, 2792.4, 2904.5, 3159.6, 2583.8  |
| Scroll completo (duración)                |             3928.3 | 4306.4, 3810.6, 5910.9, 3669.1, 3928.3      |                              3820.5 | 12698.4, 5188.1, 3820.5, 3704.2, 2306.8 |
| Scroll completo (peor intervalo)          |              250.0 | 238.9, 250, 1283.3, 250, 249.9              |                              1833.3 | 10699.6, 2833.2, 1833.3, 1516.6, 116.6  |

La ampliación más lenta baja un 76,5 % y queda por debajo de 1 s en las cinco repeticiones; el acceso completo tarda un 80,8 % menos. La serie también registra intervalos de scroll peores y muy dispersos: se conservan, no se descartan como valores atípicos ni se atribuyen a una causa sin perfilarlos. Por esa dispersión se repite la referencia con el build final (sección «Referencia del build final»).

### Qué mostró el perfil de CPU

Antes de corregir se capturaron un perfil de muestreo V8 y una traza de la línea temporal de Chromium durante las 13 ampliaciones. El modo `PERF_PROFILE=1` hace una única ejecución instrumentada y escribe `test-results/history.cpuprofile`, `history-trace.json`, `history-expansions.json` y `perfil-rendimiento.{md,json}`; no sobrescribe la referencia de cinco repeticiones. En PowerShell: `$env:PERF_PROFILE='1'; npm run perf; Remove-Item Env:PERF_PROFILE`, después del build de producción. El `.cpuprofile` se puede cargar en el perfilador JavaScript de DevTools y la traza en Performance. El modo instrumentado añade sobrecoste y no se usa para validar el umbral de 1 s.

El muestreo encontró dos costes distintos. React renderizaba de nuevo todas las filas existentes al ampliar; cada render repetía los formatos de fecha y volumen y reconstruía el mapa muscular. Además, Playwright calculaba el nombre accesible de cada botón candidato recorriendo sus descendientes para resolver `getByRole`, incluso antes de enviar el click. Los cálculos de estadísticas no dominaban: `prEvents` mantenía su memo mientras `data` no cambiaba, y el volumen de una fila solo recorría esa sesión.

| Evidencia del perfil (13 ampliaciones, ms)                                            |  Antes | Después |
| ------------------------------------------------------------------------------------- | -----: | ------: |
| Formato de fecha de fila, tiempo propio muestreado (`fmtHrowDate` → `historyDate`)    | 2879.6 |     5.3 |
| Render de `History`, tiempo propio muestreado (incluye agrupación y formato de meses) | 1139.3 |     1.7 |
| `getTextAlternativeInternal` de Playwright, tiempo propio muestreado                  | 5199.1 |    62.8 |
| Tiempo muestreado bajo funciones de `shared/stats` (incluye descendientes)            |   70.0 |     8.3 |
| Layout, duración de eventos de la traza                                               |  178.1 |   143.5 |
| Recalcular estilos (`UpdateLayoutTree`), duración de eventos                          |  214.4 |   198.8 |
| Pintado (`Paint`), duración de eventos                                                |  210.7 |   177.1 |

Estos son acumulados instrumentados, con resolución estadística, no medianas de la referencia ni categorías que deban sumarse entre sí. La captura anterior cubre 21774,3 ms y la posterior 3769,6 ms, incluyendo consultas e instrumentación entre acciones. Para la última ampliación, CDP registró antes 2570,4 ms de espera: 1591,4 ms de script, 787,9 ms de comandos DevTools, 16,1 ms de layout y 14,4 ms de estilos; después, 222,0 ms de espera, con 44,4 ms de script, 77,2 ms de comandos, 14,5 ms de layout y 13,8 ms de estilos. Los comandos incluyen parte de la automatización; el resto de la espera contiene planificación, autoscroll y comunicación. No se equipara `ScriptDuration` exclusivamente a React.

La corrección conserva las filas y SVG en el DOM: `memo` con mapa y callbacks estables evita renderizar las filas antiguas, los tres `Intl.DateTimeFormat` se reutilizan, y el nombre accesible explícito conserva todo el texto de la fila sin obligar a recorrer sus SVG decorativos. Los resúmenes siguen actualizándose al cambiar los datos o las unidades mediante el contexto del store. Hay pruebas compartidas del formato y las estadísticas (incluidos calentamientos, series pendientes, libras, pulso y ejercicios desconocidos), y un e2e que amplía por teclado hasta las 416 sesiones, comprueba sus nombres accesibles y abre la más antigua.

### Referencia del build final

Segunda serie posterior, otras cinco repeticiones sin instrumentación, terminada el 2026-11-08 a las 21:07:11 UTC. Build de producción de `c0dd8ac`, misma máquina, navegador, viewport y datos. Esta es la referencia vigente; la primera serie posterior se mantiene arriba para conservar la dispersión observada.

| Operación                                     | Mediana (ms) | Cinco muestras (ms)                    |
| --------------------------------------------- | -----------: | -------------------------------------- |
| Arranque frío hasta control interactuable     |        286.4 | 1652.3, 264.8, 287.2, 286.4, 282.4     |
| Pestaña Historial (primera visita)            |        362.8 | 362.8, 347.1, 363.6, 362.8, 347        |
| Pestaña Ejercicios (primera visita)           |        150.3 | 214.3, 114.6, 99.3, 366.2, 150.3       |
| Pestaña Perfil (primera visita)               |        166.9 | 170.8, 146.5, 166.9, 166.7, 289.4      |
| Pestaña Entrenar (primera visita)             |         46.7 | 46.4, 46.6, 48.2, 47.8, 46.7           |
| Reapertura del historial                      |         51.3 | 51.3, 51.4, 47.2, 50, 65.1             |
| Cargar historial completo (13 ampliaciones)   |       2460.7 | 3134.5, 2303.7, 2368, 2460.7, 3043.4   |
| Historial (ampliación más lenta)              |        455.7 | 455.7, 456.1, 458.8, 441.2, 454.5      |
| Scroll completo (duración del recorrido)      |       2003.3 | 2005.7, 2007.6, 1996.4, 2002.2, 2003.3 |
| Scroll completo (peor intervalo de fotograma) |         33.3 | 33.4, 33.3, 16.8, 33.3, 33.3           |

Frente a la nueva serie anterior al arreglo (1945,2 ms), la mediana de la ampliación más lenta es 455,7 ms (76,6 % menos); las cinco muestras quedan entre 441,2 y 458,8 ms. Cargar las 416 sesiones baja de 15162,5 a 2460,7 ms (83,8 % menos). Ninguna espera individual medida supera 1 s de mediana. El peor intervalo de scroll es ahora 33,3 ms de mediana: los saltos de la primera serie posterior no se repiten en esta serie; no se atribuyen a una causa concreta ni se promete rendimiento idéntico bajo otra carga del sistema.

Validación: `npm run check` pasa (574 tests, tipos, lint, build y bundle MCP generado sin diferencias). La suite completa de Playwright pasa con cuatro workers: 96 tests, incluidas las auditorías WCAG en claro/oscuro y las 416 sesiones por teclado. Con el paralelismo automático de 16 workers hubo fallos intermitentes en pruebas previas de RIR y selección de ejercicio; la ejecución completa se confirmó con `node node_modules/@playwright/test/cli.js test --workers=4`. No se cambian esas pruebas ni sus plazos.
