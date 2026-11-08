# Verificación de accesibilidad de la PWA

Auditoría del 8 de noviembre de 2026, issue #126. Parte de #125.

## Alcance y método

Build de producción de la PWA, Chromium con viewport Pixel 7, idioma es-ES y datos de ejemplo de `e2e/fixtures.ts`.
Cada pantalla se comprueba con `colorScheme: 'light'` y `'dark'` de Playwright, sin forzar el tema manual de la app.
Axe ejecuta las reglas etiquetadas `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa`: incluye contraste de texto, nombres accesibles, etiquetas y uso de ARIA.
Los tests fallan también ante errores JavaScript y diálogos nativos inesperados.

| Pantalla / estado | Claro | Oscuro | Test |
| --- | --- | --- | --- |
| Entrenar, con rutinas y actividad semanal | Sin violaciones axe | Sin violaciones axe | `e2e/a11y.spec.ts` |
| Historial, con sesiones | Sin violaciones axe | Sin violaciones axe | `e2e/a11y.spec.ts` |
| Ejercicios, catálogo y filtros | Sin violaciones axe | Sin violaciones axe | `e2e/a11y.spec.ts` |
| Ejercicio, ficha con progresión | Sin violaciones axe | Sin violaciones axe | `e2e/a11y.spec.ts` |
| Perfil y Coach | Sin violaciones axe | Sin violaciones axe | `e2e/a11y.spec.ts` |
| Artículos, biblioteca y lectura | Sin violaciones axe | Sin violaciones axe | `e2e/a11y.spec.ts`, `e2e/articles.spec.ts` |
| Noticias, lista con fuentes, temas y enlaces | Sin violaciones axe | Sin violaciones axe | `e2e/news.spec.ts` |
| API keys en Ajustes, formulario, claves existentes, nueva clave y guías desplegadas | Sin violaciones axe | Sin violaciones axe | `e2e/account.spec.ts` |

Noticias y API keys usan respuestas de red simuladas para probar contenido y estados de cuenta de forma reproducible, sin credenciales reales.
El test de Artículos también comprueba filtros, devolución del foco y lectura offline; el de API keys recorre caducidad, generación, copia y revocación.

## Teclado y foco

`registrar una serie solo con teclado y foco visible` se ejecuta en ambos temas.
Desde Entrenar alcanza «Empezar» mediante Tab, abre el registro con Enter, llega a peso y repeticiones con Tab,
escribe 100 kg y 5 repeticiones y confirma con Espacio en «Completar serie».
Comprueba los valores, el estado hecho y `aria-pressed`, y termina con Enter hasta el resumen.
No usa clics, `focus()` ni `fill()` para completar el recorrido.
En cada destino verifica foco real, `:focus-visible`, visibilidad y anillo de al menos 2 px o borde con el token `--accent-ink`.

## Movimiento reducido

Con `reducedMotion: 'reduce'`, los tests inspeccionan duración y retardo computados de animaciones y transiciones,
incluidos `::before` y `::after`: todos deben valer exactamente 0 ms.
Se comprueban las pantallas de la auditoría principal, el registro con descanso y el resumen.
Una prueba adicional monta las primitivas transitorias de `docs/diseno.md` (skeleton, toast, modal, sheet,
listas, insignias, serie hecha y pestaña activa) y activa explícitamente `html.theme-anim`.

Se corrigieron en este PR los 0,01 ms globales y los retardos de entrada escalonada.
También se corrigió la prioridad de la transición de tema: su regla `!important` imponía 350 ms pese a la preferencia de movimiento reducido.
El desplazamiento CSS pasa a `auto`; los estados finales siguen siendo visibles y utilizables.

## Resultado y límites

Verificación final: `npm run check` aprobado (569 tests unitarios), suite completa con 99 e2e aprobados
y 27 e2e de accesibilidad/cuenta/artículos/noticias repetidos tras añadir explícitamente las reglas `wcag21a`, también aprobados.

No quedan fallos de accesibilidad detectados en este alcance pendientes de otra issue; los fallos pequeños encontrados se corrigen en este PR.
La ausencia de violaciones automáticas no certifica por sí sola todo WCAG: esta comprobación cubre las pantallas,
estados y recorrido de teclado descritos, sin sustituir una revisión con lectores de pantalla o todos los contenidos posibles.

Para repetir la verificación:

```sh
npm run check
npm --prefix app run build && npm run e2e
```

Si hay otras PWA de este repositorio ejecutándose en paralelo, usa un `PLAYWRIGHT_PORT` libre para que el preview pertenezca a este checkout.
