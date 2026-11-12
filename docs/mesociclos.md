# Mesociclos

Programas de 4 a 12 semanas con carga por % de 1RM o RPE objetivo (#137, propuesta H7 de `docs/revision-hevy.md`).
Código: `shared/mesocycle.ts` (lógica y tests) y `app/src/components/Program.tsx` (interfaz).

## Modelo

Un programa es **una carpeta de rutinas con un campo `mesocycle`**. Las rutinas de la carpeta son los días.

```ts
RoutineFolder { id; name; mesocycle?: Mesocycle }
Mesocycle {
  startedAt;            // ISO: cuentan las sesiones de la carpeta desde aquí
  weeks: MesoWeek[];    // 4 a 12
  lifts: string[];      // ejercicios principales
  oneRm?;               // 1RM escrito a mano (kg) por ejercicio
  overrides?;           // prescripción propia por ejercicio y semana
  template?; endedAt?;
}
MesoWeek { phase: 'acumulacion' | 'intensificacion' | 'descarga'; main: { sets; reps; repsMin?; pct?; rpe? }; accessorySets? }
```

Por qué en la carpeta y no en una colección nueva:

- El sync guarda una fila por objeto en colecciones fijas (`supabase/migrations/001_records.sql`). Una colección nueva exigiría migración; la carpeta ya se sincroniza, exporta e importa.
- Las versiones anteriores de la app conservan el campo: renombrar la carpeta muta `name` y deja el resto. `normalizeData` descarta un `mesocycle` roto sin perder la carpeta.
- `nextRoutine` ya rota dentro de la carpeta, así que «Hoy toca» sigue funcionando sin cambios.

## Progreso

Por **sesiones terminadas**, no por calendario: una semana es una vuelta a las rutinas de la carpeta. Saltarse un día no salta la semana. Si se añaden o quitan rutinas a mitad del bloque, la semana se recalcula con el nuevo número de días.

## Carga

- 1RM vigente = el escrito a mano o, si no hay, el mejor estimado (Epley, `estimate1RM`) de los 120 días **anteriores al inicio**. Se congela al empezar para que los pesos de una semana no cambien a mitad del bloque; el siguiente bloque («Empezar otro bloque») usa ya las sesiones del anterior.
- Peso = 1RM × %, redondeado **hacia abajo** al incremento del ejercicio (`weightStep`: 2,5 kg, 5 kg en barra de pierna, 2 kg en mancuernas; 5 o 10 lb) en la unidad visible. Se guarda en kg.
- Sin 1RM no se inventa un peso: la sesión conserva el de la rutina y la nota lo dice; la vista de seguimiento pide escribirlo.
- Semanas por RPE: series y reps prescritas, peso de la rutina y el RPE objetivo en la nota.

## Relación con la progresión doble y la descarga

- Los **principales** siguen la prescripción: en el registro no aparece la sugerencia de `suggestNext` ni el aviso de `evaluateStagnation`, que contradirían el plan. El entreno lleva `program.lifts` para saberlo.
- Los **demás** ejercicios siguen la rutina y la progresión doble de siempre.
- La semana de **descarga** de las plantillas sigue `docs/investigacion-descarga.md` (Bell 2023/2025): mitad de series en todo (`accessorySets: 0.5`) y carga parecida o algo menor, lejos del fallo. Nunca se baja al 60 %.

## Plantillas

| Plantilla | Semanas | Carga |
| --- | --- | --- |
| Bloque de fuerza | 4 | 70 → 75 → 82,5 % y descarga |
| Fuerza | 8 | dos olas 67,5–87,5 % con descarga en la 4 y la 8 |
| Hipertrofia por RPE | 6 | RPE 7 → 9 y descarga a RPE 6 |

Al crear, el primer ejercicio con peso y reps de cada rutina queda como principal; se puede cambiar, igual que series, reps, fase y carga de cada semana.

## Fuera de alcance

- Pesos calculados en el reloj al empezar desde él: el móvil sí los aplica (`start_routine` usa `workoutForRoutine`), el reloj en modo autónomo usa la rutina tal cual.
- Editar `overrides` desde la interfaz (el modelo y la lógica lo admiten).
- Herramientas MCP para crear programas.
- Programas por calendario (fechas fijas) y tests de 1RM guiados.
