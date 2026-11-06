# Contrato de rangos de repeticiones y doble progresión

Documento de diseño de #84 (parte de #31, hueco H2 de `docs/revision-hevy.md`). No cambia código: fija el modelo,
las reglas y el plan para que las tareas de implementación sean mecánicas.

Hoy `RoutineExercise.sets[].reps` guarda un número fijo y `suggestNext(prev, ex, targetReps)` recibe un escalar
(`shared/progression.ts:30`). La doble progresión pide un rango `[mín, máx]`: se mantiene el peso hasta llegar al
techo en todas las series de trabajo; entonces se sube peso y se vuelve al suelo.

## 1. Modelo de datos

### Decisión: rango por serie, `reps` pasa a ser el techo, `repsMin` es opcional

```ts
// shared/types.ts — RoutineExercise.sets[] y WorkoutSet
reps?: number;     // sin cambios. Con repsMin presente es el TECHO del rango; sin él, el objetivo fijo de siempre.
repsMin?: number;  // nuevo, opcional. Suelo del rango. Ausente = sin rango (comportamiento actual).
```

Por qué así (alternativas descartadas):

| Alternativa | Veredicto |
|---|---|
| `reps: number \| {min,max}` | Descartada: rompe cualquier lector antiguo (`reps` dejaría de ser número) en backups, sincronización, enlaces y reloj. |
| `targetRepsMin/Max` a nivel de ejercicio | Descartada: la rutina ya modela series individuales (pirámides, back-off); un rango único no las expresa y obligaría a una segunda fuente de verdad junto a `reps`. |
| **`repsMin` junto a `reps` por serie** | **Elegida.** Un solo campo nuevo, opcional; `reps` conserva su significado ("lo que escribe la serie al empezar") y los lectores antiguos ven el techo, que es un objetivo válido. Cada serie puede tener su rango. |

Consecuencias:

- **Validación** (función `normalizeRepRange` en `shared/progression.ts`, usada al guardar y al importar):
  `repsMin` y `reps` enteros entre 1 y 100; `repsMin ≤ reps`. `repsMin` sin `reps`, o `repsMin > reps`, o valores no enteros → se **descarta `repsMin`** y la serie queda como objetivo fijo. Nunca lanza al importar: un dato manipulado o antiguo no debe bloquear la carga (`normalizeData` ya es tolerante). `repsMin === reps` se normaliza a "sin rango".
- **Solo aplica a `kind` con repeticiones** (`weight_reps`, `reps`, `assisted`). Para `duration` y `distance` se ignora y la UI no ofrece el rango.
- **Rutinas antiguas**: sin `repsMin` → rango degenerado `[reps, reps]`. `suggestNext` se comporta exactamente como hoy (las reglas de §2 con `mín = máx` equivalen al código actual, salvo que ignoran las series `drop`; ver P2). Ninguna migración, `version` de datos sigue en 1.
- **Del plan a la sesión**: `workoutFromRoutine` (`shared/data.ts:109`) copia `repsMin` a cada `WorkoutSet` además de `reps`. Así el registro de entreno conoce el rango sin consultar la rutina (que puede haberse editado o borrado). Al terminar la serie `repsMin` queda como "lo que se pretendía"; no se usa para estadísticas.
- **Sin rutina** (entreno libre): sin `repsMin`; `suggestNext` infiere como hoy el objetivo de las reps de la última sesión.

### Firma de `suggestNext`

```ts
export interface RepTarget { min: number; max: number; plannedSets?: number }
suggestNext(prev: WorkoutSet[], ex?: Exercise, target?: number | RepTarget): Suggestion | null
```

El escalar sigue admitido (equivale a `{min: n, max: n}`) para no romper `suggest_next` de MCP ni llamadas antiguas.
`plannedSets` = series de trabajo previstas (no calentamiento) de la rutina; si falta, se usa el nº de series hechas al peso máximo.
`Suggestion` no cambia de forma; `action` reutiliza `'up' | 'repeat' | 'reps'`.

## 2. Reglas de sugerencia (rango `[mín, máx]`)

Aplica a `weight_reps`. (`reps`/`assisted` mantienen "suma una repetición" hasta `máx`, y a partir de ahí no hay
peso que subir: la sugerencia se queda en `máx` — ver decisión pendiente P3.)

1. **Series evaluadas**: las hechas (`done`), sin `warmup` ni `drop`, al **peso más alto** de la sesión (`top`). Las `failure` cuentan. Las series a menos peso (back-off) no deciden.
2. **Esfuerzo**: RPE medio de esas series > 8,5 = "exigente"; sin RPE registrado = no exigente (como hoy).
3. **Completa**: nº de series evaluadas ≥ `plannedSets` (o el nº de series al peso máximo si no hay plan).
4. Resultado, en este orden:

| # | Condición | Sugerencia | `action` |
|---|---|---|---|
| a | Completa, todas `reps ≥ máx`, no exigente | siguiente peso cargable × `mín` | `up` |
| b | Completa, todas `reps ≥ máx`, exigente | mismo peso × `máx` (consolidar; nunca pasar del techo) | `repeat` |
| c | Alguna `reps < mín` | mismo peso × `mín` | `repeat` |
| d | Todas `reps ≥ mín`, alguna `< máx` | mismo peso × `min(máx, (reps mínimas hechas) + 1)` | `reps` |
| e | Incompleta (faltan series), sin ninguna `< mín` | mismo peso × `min(máx, (reps mínimas hechas) + 1)`, o `máx` si todas llegaron | `repeat` |

c va antes que e: quedarse por debajo del suelo manda sobre cualquier otra señal. El peso nunca baja automáticamente (ver P1).

Si el rango es por serie, cada condición se evalúa serie a serie con su propio `[mín, máx]` (la serie i de hoy contra la i de la
última vez; las series extra usan el rango de la última serie). La sugerencia por serie aplica a cada serie pendiente su `reps`;
el chip muestra el rango de la primera pendiente.

### Siguiente peso cargable

No cambia: múltiplo de `weightStep(ex, unidad)` por encima de `top`, calculado **en la unidad visible** y guardado en kg
(`shared/progression.ts:57-60`). Los rangos no tocan `weightStep` ni `units.ts`: el rango son repeticiones, sin unidad.
Los tests de rango deben correr en `kg` **y** `lb` (`setWeightUnit('lb')`) comprobando que el peso subido sale del incremento de la unidad.

### Tabla de ejemplos — rango 8-12, press banca, 3 series previstas, `weightStep` 2,5 kg

| Última sesión (kg × reps) | RPE | Caso | Sugerencia hoy | Regla |
|---|---|---|---|---|
| 80×12, 80×12, 80×12 | 8 | techo en todas | **82,5 × 8** | a |
| 80×12, 80×12, 80×12 | 9,5 | techo pero RPE alto | **80 × 12** (consolida) | b |
| 80×12, 80×11, 80×10 | 8 | cumplimiento parcial | **80 × 11** | d |
| 80×10, 80×10, 80×9 | 8 | en rango, sin techo | **80 × 10** | d |
| 80×8, 80×8, 80×7 | 9 | alguna por debajo del mínimo | **80 × 8** | c |
| 80×12, 80×12 (2 de 3 hechas) | 8 | serie incompleta | **80 × 12** (no sube) | e |
| calentamiento 40×12 + 80×12 ×3 | 8 | calentamiento ignorado | **82,5 × 8** | a |
| 80×12 ×3 + back-off 70×15 | 8 | peso distinto: decide el máximo | **82,5 × 8** | a |
| 82,5×12, 80×12, 80×10 | 8 | solo 1 serie al máximo (< 3 previstas) | **82,5 × 12** (no sube) | e |
| 80×12 ×3, con una serie `drop` 60×15 | 8 | `drop` no cuenta | **82,5 × 8** | a |
| 80×13, 80×12, 80×12 | 8 | superar el techo vale | **82,5 × 8** | a |

Mancuernas (paso 2): 24×12 ×3 → 26 × 8. Libras con paso 5: 175×12 ×3 → 180 × 8 (guardado en kg).

## 3. Interacciones

| Área | Impacto | Rutas / pruebas de compatibilidad |
|---|---|---|
| **Backups / `normalizeData`** | `repsMin` es opcional y se conserva sin cambios (la normalización no reescribe series). Backup antiguo → sin rango. Backup nuevo en app antigua → `repsMin` ignorado, `reps` = techo. | `shared/backups.test.ts`, `shared/shared.test.ts`: round-trip con y sin `repsMin`; `repsMin` inválido se descarta. |
| **Sync Supabase** | Las rutinas viajan como objeto completo (`shared/sync.ts`, colección `routines`): campo nuevo pasa sin cambio de esquema ni migración. | `shared/sync.test.ts`: diff de rutina cuando solo cambia `repsMin`. **No tocar `supabase/`.** |
| **Enlaces compartidos** | Carga `v: 1`; cada serie es la tupla `[tipo, reps, kg, seg]`. Se añade un 5.º elemento `repsMin \| null` **solo si alguna serie tiene rango** (si no, el enlace es idéntico al de hoy). El decodificador antiguo lee los 4 primeros y ignora el resto (comprobado: `decodeRoutine` desestructura por posición). El nuevo valida con `normalizeRepRange` y `num(…, 100)`. | `shared/routine-share.test.ts`: enlace generado antes (fixture fijo) sigue decodificando; round-trip con rango; manipulado (`repsMin > reps`, texto, negativo) se descarta sin error. Subir `v` **no** es necesario. |
| **MCP** | `create_routine` acepta `reps_min` opcional por ejercicio (aplica a todas sus series; `reps` = techo) y valida con `normalizeRepRange`. `suggest_next` acepta `target_reps_min` opcional junto a `target_reps` (techo). Sin los nuevos campos, comportamiento idéntico. `RoutineDraft` (`shared/data.ts:81`) y `routineFromDraft` se amplían. Regenerar `supabase/functions/mcp/index.ts` con `npm run check` y **commitearlo** (AGENTS.md). | `shared/mcp.test.ts`, `shared/tools-coverage.test.ts`, `mcp/` tests. |
| **Crear sesión** | `workoutFromRoutine` copia `repsMin`. `controller.ts:176` y `SharedRoutine.tsx:61` ya pasan por ahí. `repsMin` no se guarda al "guardar entreno como rutina" salvo que la serie lo tuviera. | `shared/session.test.ts` / `shared/shared.test.ts`. |
| **Reloj Wear OS** | `watchSnapshot` (`shared/session.ts:125-152`) solo expone `reps` y `prevReps`; sigue mostrando el techo como objetivo. **Sin cambios de protocolo** (`v: 1`). Mostrar el rango en el reloj queda fuera (P4). | `shared/watch-library.test.ts` sin cambios. |
| **Hevy/Strong import** | Los importadores no producen rango: serie sin `repsMin`. | Sin cambios. |
| **Unidades** | Ver §2: el rango no tiene unidad; el peso sugerido se sigue calculando en la unidad visible. | `shared/progression.test.ts` en `kg` y `lb`. |

## 4. Interfaz y textos (siguiendo `docs/diseno.md`)

Se reutilizan primitivas existentes; no se crea ninguna variante nueva (§8).

**Editor de rutina** (`RoutineEditor.tsx`, la fila de serie ya usa `NumberField`, línea ~166):
- La columna "Reps" admite un segundo campo opcional. Por serie: `NumberField` "Mín." y `NumberField` "Máx." (decimals `false`), `inputMode="numeric"`, mismo tamaño táctil que el resto (§6).
- Etiquetas accesibles (AA): `aria-label="Repeticiones mínimas, serie 2"` y `aria-label="Repeticiones máximas, serie 2"`. Hoy es "Repeticiones".
- Atajo por ejercicio: botón `.ghost small` "Mismo rango en todas las series" (equivale a copiar la serie 1; accesible por teclado, sin gesto).
- Dejar "Mín." vacío = objetivo fijo (comportamiento de hoy). No hay interruptor aparte.
- Errores en línea (`.small` con color de error de los tokens, `aria-live="polite"`, sin emoji):
  - `Mín. no puede ser mayor que Máx.` (se marca el campo, `aria-invalid`, y no se guarda `repsMin`)
  - `Indica un número entre 1 y 100.`
- Ayuda bajo la lista (`.small.muted`, una vez): `Con un rango, la app te sugiere subir peso cuando llegues al máximo en todas las series.`

**Registro de entreno** (`WorkoutLogger.tsx`, `SuggestionChip`, línea ~727):
- El chip sigue siendo "Hoy: **82,5 kg × 8**". Con rango, el desplegable (`sug.reason`) añade el objetivo: `Objetivo: 8-12 reps · Si haces 3×12, la próxima vez subes a 82,5 kg.`
- La serie pendiente muestra el rango como `placeholder` del campo de reps (`8-12`) cuando está vacía; no sustituye al valor.
- Textos de `reason` por regla (sustituyen a los actuales solo cuando hay rango): a) `Llegaste a 3×12 con 80 kg: sube a 82,5 kg y vuelve a 8.` b) `Techo alcanzado pero muy exigente (RPE alto): mantén 80 kg y repite 12.` c) `Quedaste por debajo de 8 con 80 kg: repite el peso hasta llegar a 8.` d) `En rango, aún no en el techo: mantén 80 kg y busca 11.` e) `Te faltaron series: completa 3×12 con 80 kg antes de subir.`
- Peso en la unidad visible (`fmtWeight`); nunca texto fijo en kg.

## 5. Plan de implementación (tareas acotadas)

Cada tarea = una issue, `size:s`/`m`, un PR. Orden obligatorio: T1 antes que T2-T5. Todas llevan test; T3-T5 pueden ir en paralelo tras T1.

| Tarea | Alcance | Criterios verificables | Etiqueta |
|---|---|---|---|
| T1 Modelo y validación | `repsMin` en `shared/types.ts`; `normalizeRepRange`; `workoutFromRoutine` copia `repsMin`. | Tests: rangos válidos/ inválidos se descartan sin lanzar; round-trip `normalizeData`; rutina vieja sin cambios. `npm run check`. | `agent:codex` `size:s` |
| T2 Motor | `suggestNext` con `RepTarget` según §2; `plannedSets` desde el chip. | Una prueba por fila de la tabla de §2 y en `kg` y `lb`; el escalar actual sigue pasando los tests existentes de `progression.test.ts`. | `agent:codex` `size:m` |
| T3 Editor | Campos Mín./Máx., atajo, errores, ayuda de §4. | `npm run check`; e2e a11y (axe) y 360 px con la hoja del editor; cada control con nombre accesible. **`necesita:pc`** para capturas. | `agent:claude` `necesita:pc` |
| T4 Registro | Chip con objetivo y `reason` por regla, placeholder del rango. | `check`; e2e del chip; texto en `lb`. **`necesita:pc`**. | `agent:claude` `necesita:pc` |
| T5 Compartir y MCP | 5.º elemento de la serie en el enlace; `reps_min` / `target_reps_min` en MCP; regenerar `supabase/functions/mcp/index.ts`. | Fixture de enlace antiguo decodifica; manipulados se descartan; `tools-coverage` pasa; función MCP regenerada en el commit. | `agent:codex` `size:m` |
| T6 Cierre | Entradas en `shared/changelog.ts` y `CHANGELOG.md`; actualizar `docs/revision-hevy.md` (H2) y `docs/investigacion-competidores.md` (fila "Parcial"). | `check`. | `agent:codex` `size:s` |

## 6. Decisiones pendientes (no inventadas; registradas en #84)

- **P1 — Bajar peso**: ¿tras varias sesiones por debajo del mínimo (p. ej. 2 seguidas) se sugiere bajar un paso (descarga)? Por defecto este contrato **no** baja peso nunca.
- **P2 — Series `failure` y `drop`**: este contrato cuenta `failure` y excluye `drop` solo en modo rango. ¿Mantener esa diferencia con el modo fijo actual (que cuenta `drop`)?
- **P3 — Peso corporal / asistido**: al llegar a `máx` no hay peso que subir; ¿sugerir lastre / menos asistencia o quedarse en el techo?
- **P4 — Reloj**: ¿mostrar el rango en Wear OS (cambia el protocolo y la app Android, `necesita:pc`)?
- **P5 — Rango por ejercicio como atajo de datos**: si el uso demuestra que casi todo son rangos iguales, ¿derivar a un campo por ejercicio? Hoy no compensa duplicar la fuente de verdad.
