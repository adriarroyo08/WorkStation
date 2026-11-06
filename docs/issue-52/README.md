# Verificación de la issue #52

- `npm run check`: correcto, 32 ficheros y 243 tests; cobertura de líneas 95,34 %.
- `npm --prefix app run build` y `npm run e2e`: correctos, 71 pruebas e2e.
- Axe sin infracciones en las fichas con fuentes y estimada, en claro y oscuro.
- La prueba abre la ficha con foco en la fila y Enter; los controles nativos de filtro tienen nombre accesible.
- Las pruebas nuevas usan `reducedMotion: reduce` en ambos temas.
- Catálogo y personalizados sin metadatos: apertura correcta y ausencia de sección de evidencia.
- Se descartó la regeneración incidental de `docs/evidencia-ejercicios.md`.

Las capturas anteriores se generaron compilando los tres componentes originales del commit `34db916`; después se restauró la implementación verificada.

| Estado | Biblioteca | Ficha |
| --- | --- | --- |
| Antes | [Biblioteca](evidence-before-library.png) | [Ficha](evidence-before-detail.png) |
| Después, claro | [Filtros](evidence-filters-light.png) | [Con fuentes](evidence-sourced-light.png), [estimada](evidence-estimated-light.png) |
| Después, oscuro | [Filtros](evidence-filters-dark.png) | [Con fuentes](evidence-sourced-dark.png), [estimada](evidence-estimated-dark.png) |

Revisión del PR: se restaura el mapa interactivo y las chips para todos los ejercicios; la prueba original comprueba de nuevo aria-expanded y las tres partes del pecho, y los casos sin metadatos comprueban mapa y chips sin sección de evidencia. Las fuentes sin URL ni DOI se presentan como texto.
