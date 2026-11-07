# Issue #61 — Noticias

Versión 1.16.0. Acceso desde la cabecera de Entrenar, sin añadir pestañas. Se reutilizan Back, tarjetas, controles y colores de la app.

## Verificación

- `npm run check`: correcto; 450 tests, cobertura de líneas 96,75 %, ramas 85,03 %.
- `npm --prefix app run build`: correcto.
- `npm run e2e`: 79 pruebas correctas con el build de producción. Se usó una configuración temporal equivalente para servir en IPv4 en el puerto 4174 (otra vista previa ocupaba ::1); Chromium resolvió localhost a 127.0.0.1. No se modificaron las pruebas existentes ni la configuración permanente.
- `e2e/news.spec.ts`: endpoint propio simulado con route; filtros combinables y limpieza, enlaces externos seguros, actualización HTTP 503 conservando datos, recarga completa offline con service worker y lectura de la copia persistida, error sin caché, respuesta inválida y vacío válido.
- Teclado: foco inicial en el título; Tab alcanza Fuente. Controles con nombre accesible y axe WCAG 2.1 AA sin infracciones en ambos temas, con `prefers-reduced-motion: reduce`.
- Tests compartidos: validación de respuestas/cachés y enlaces, filtros y distinción entre fallo total, parcial y éxito vacío.

Los fixtures de artículos del checkout Windows tenían CRLF y sus tests hacen sustituciones literales con LF. Se normalizaron localmente para ejecutar check; no hay cambios de contenido editorial en el commit. El build generado de MCP no presenta diferencias de contenido.

## Capturas

| Estado | Claro | Oscuro |
| --- | --- | --- |
| Antes: Entrenar en la base 9da0de9, sin Noticias | [antes-light](antes-light.png) | [antes-dark](antes-dark.png) |
| Después: entrada visible en Entrenar | [entrada-light](entrada-light.png) | [entrada-dark](entrada-dark.png) |
| Después: noticias, filtros y foco de teclado | [noticias-light](noticias-light.png) | [noticias-dark](noticias-dark.png) |

Las capturas anteriores se obtuvieron compilando App y Train del commit base en una salida temporal independiente. Las capturas posteriores usan noticias sintéticas, sin visitar proveedores.

## Almacenamiento y red

La pantalla solicita únicamente GET al endpoint `/functions/v1/mcp/news` del Supabase configurado. No solicita imágenes, feeds ni artículos de los proveedores; el original se abre solo al pulsar el enlace, con noopener/noreferrer. La última respuesta validada se guarda en localStorage (`ws:news:v1`), sin cuerpos de artículos; errores de red, JSON inválido y fallo total del recolector no la sustituyen. Un vacío válido sí se guarda. Las fuentes desactualizadas y los fallos de almacenamiento se indican en pantalla.

La caché del backend conserva la limitación de persistencia entre instancias descrita en `../recolector-noticias.md`; esta issue añade la copia offline del cliente y no modifica el servidor.
