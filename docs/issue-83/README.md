# Importación directa de Strong — #83

Flujo verificado con Playwright sobre el build de producción y viewport Pixel 7, en claro y oscuro. Los CSV de prueba están en `shared/fixtures/strong`; son ejemplos sintéticos anonimizados del contrato admitido, sin datos de cuentas reales.

## Evidencias

| Paso | Claro | Oscuro |
| --- | --- | --- |
| Unidad ausente: confirmación bloqueada y diagnóstico | [Captura](light-unidad.png) | [Captura](dark-unidad.png) |
| Unidad elegida: sesiones, series, ejercicios y notas multilínea | [Captura](light-previa.png) | [Captura](dark-previa.png) |
| Importación confirmada | [Captura](light-confirmada.png) | [Captura](dark-confirmada.png) |

`e2e/strong.spec.ts` verifica que seleccionar y cancelar (botón, Enter o Escape) conserva los datos, que el foco circula dentro del diálogo con Tab/Mayús+Tab y que confirmar guarda primero una copia de los datos anteriores en IndexedDB. Comprueba también el diagnóstico de fechas ambiguas, columnas desconocidas y el bloqueo cuando no hay series válidas. La auditoría axe WCAG 2.1 AA de la vista previa no detecta infracciones en ninguno de los dos temas.

## Contrato

Las cabeceras, separadores, formatos de fecha/duración y unidades admitidas están documentados en `shared/strong.ts`. No se deducen unidades: se solicita kg/lb para los pesos sin unidad y m/km/mi para las distancias sin unidad. Los valores cero de distancia son independientes de la unidad. Las fechas ambiguas se omiten con diagnóstico y deben corregirse en el CSV; las filas válidas pueden importarse tras revisar el resumen.

Se conserva el orden de las series, con W/D/F como calentamiento/drop/fallo. `Workout #`, cuando existe, distingue sesiones aunque compartan nombre e inicio; reimportar el mismo archivo actualiza las sesiones por su identificador estable. Los ejercicios se resuelven con el mapa común de Hevy y las convenciones de `shared/data.ts`; los desconocidos se crean como personalizados solamente al confirmar. No se reconstruyen rutinas desde Strong.

## Verificación

- `npm run check`: lint, tipos, 284 tests (36 de Strong y uno del helper de plurales), cobertura y builds correctos.
- `npm --prefix app run build` y `npm run e2e`: build de producción correcto y 75 e2e superados (4 de Strong).

Revisión del PR #106: la falta de unidad genera un solo aviso por unidad, sin contar las filas pendientes como omitidas; regresión con 3.000 series y una fila inválida. El resumen, el detalle y la confirmación usan singular/plural; el e2e comprueba un entrenamiento, una serie, un ejercicio personalizado nuevo y un registro omitido.

El bundle generado `supabase/functions/mcp/index.ts` se incluye conforme a AGENTS.md. Se descarta la reescritura automática ajena a esta issue de `docs/evidencia-ejercicios.md`.
