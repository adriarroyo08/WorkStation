# Rendimiento de referencia

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
