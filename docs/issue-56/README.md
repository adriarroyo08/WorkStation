# Biblioteca de artículos (#56)

Versión 1.15.0. Entrada desde Ejercicios, sin nueva pestaña. Se reutiliza el índice editorial de #54; el corpus incluido actualmente contiene un artículo, sin añadir contenido desde esta issue.

El lector acepta `#articles/<slug>` desde el Coach, enlaces externos y recargas. Al cerrarlo conserva la pantalla anterior; un slug desconocido muestra un estado explícito. Se incluye en las novedades de 1.15.0 la integración Coach/MCP de #57, según la indicación del coordinador (PR #110).

## Evidencia visual

- `antes-light.png` y `antes-dark.png`: pantalla Ejercicios compilada con el componente de `main` anterior al cambio (9da0de9).
- `entrada-light.png` y `entrada-dark.png`: acceso a la biblioteca desde Ejercicios.
- `lista-light.png` y `lista-dark.png`: búsqueda y dos etiquetas activas.
- `lectura-light.png` y `lectura-dark.png`: fecha, evidencia, lectura y referencias.

Capturas en Chromium con viewport Pixel 7, locale es-ES y movimiento reducido. La auditoría axe WCAG 2.1 AA cubre lista y detalle en ambos temas. El e2e abre la biblioteca y el artículo con Enter, comprueba el foco al volver y conserva búsqueda y etiquetas.

## Offline

El e2e espera a que el service worker termine de instalarse, navega para que tome control, desconecta la red y recarga. Comprueba listado y lectura incluso sin haber abierto antes la biblioteca. Las referencias DOI se muestran como enlaces externos que requieren conexión; el texto completo incluido se sirve desde el precache existente de `articles.json`.

## Verificación

- `npm run check`: lint, tipos, 430 tests con cobertura y builds correctos. Se normaliza la muestra editorial a LF en el test existente para admitir checkouts CRLF de Windows.
- `npm --prefix app run build`: correcto.
- `PLAYWRIGHT_PORT=49656 npm run e2e -- --workers=2`: 79 pruebas correctas, incluidas las auditorías generales claro/oscuro (en PowerShell se usa `$env:PLAYWRIGHT_PORT='49656'` y `npm.cmd` para conservar los argumentos).

Las primeras ejecuciones detectaron un fallo intermitente en el arrastre de rutinas y una colisión del puerto 4174 con otra app de otro worktree (servía 1.16.0). La verificación final usa un puerto exclusivo, configurable con `PLAYWRIGHT_PORT`; dos tests existentes pasan a comparar el origen real en lugar de fijar 4174. No se modificó el flujo de arrastre.
