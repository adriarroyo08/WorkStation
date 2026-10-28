// Herramientas MCP de Workstation, independientes del transporte (stdio local o HTTP remoto)
// y del origen de los datos (fichero JSON o nube con API key).
import { z } from 'zod';
import { achievements } from './achievements';
import { findOrCreateExercise, routineFromDraft } from './data';
import { convertHevyApiWorkouts, fetchHevyWorkouts, hevySummary } from './hevy';
import { muscleRecovery, nextRoutine } from './planning';
import { suggestNext } from './progression';
import { LEVELS, latestBodyweight, strengthLevels } from './strength';
import { period, periodReport, reportToText, weekStreak } from './reports';
import { exerciseHistory, formatSet, lastSessionSets, personalRecords, trainingSummary, workoutDurationMin, workoutVolume } from './stats';
import { PROGRAMS, instantiateProgram } from './templates';
import { uid, type Workout, type WorkstationData } from './types';

export interface DataSource {
  label: string;
  load(): Promise<WorkstationData>;
  save(data: WorkstationData): Promise<void>;
  // Texto que se añade tras escribir (p. ej. "importa el fichero en la app").
  afterWrite?: string;
  env?: (name: string) => string | undefined;
}

export interface ToolDef<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  shape: S;
  write?: boolean;
  run(src: DataSource, args: z.infer<z.ZodObject<S>>): Promise<string>;
}

const tool = <S extends z.ZodRawShape>(t: ToolDef<S>) => t as unknown as ToolDef;
const json = (v: unknown) => JSON.stringify(v, null, 2);

function resolveExercise(data: WorkstationData, q: string) {
  const s = q.toLowerCase();
  return data.exercises.find((e) => e.id === q) ?? data.exercises.find((e) => e.name.toLowerCase() === s) ?? data.exercises.find((e) => e.name.toLowerCase().includes(s));
}

async function write(src: DataSource, data: WorkstationData, msg: string) {
  await src.save(data);
  return src.afterWrite ? `${msg} ${src.afterWrite}` : msg;
}

export const TOOLS: ToolDef[] = [
  tool({
    name: 'training_summary',
    description: 'Resumen en texto del historial de entrenamiento: últimos entrenamientos, récords y peso corporal. Úsalo primero para tener contexto.',
    shape: { last_n: z.number().int().min(1).max(100).optional().describe('Nº de entrenamientos recientes (por defecto 10)') },
    run: async (src, { last_n }) => trainingSummary(await src.load(), last_n ?? 10),
  }),
  tool({
    name: 'list_workouts',
    description: 'Lista entrenamientos (más recientes primero) con fecha, duración, volumen y ejercicios.',
    shape: { limit: z.number().int().min(1).max(200).optional(), since: z.string().optional().describe('Fecha ISO mínima, p.ej. 2026-09-01') },
    run: async (src, { limit, since }) => {
      const data = await src.load();
      const names = new Map(data.exercises.map((e) => [e.id, e.name]));
      return json(
        [...data.workouts]
          .filter((w) => !since || w.startedAt >= since)
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
          .slice(0, limit ?? 20)
          .map((w) => ({
            id: w.id,
            name: w.name,
            date: w.startedAt,
            minutes: workoutDurationMin(w),
            volume_kg: workoutVolume(w, data.exercises),
            avg_hr: w.heartRate?.avg,
            exercises: w.exercises.map((e) => names.get(e.exerciseId) ?? e.exerciseId),
          })),
      );
    },
  }),
  tool({
    name: 'get_workout',
    description: 'Detalle completo de un entrenamiento (todas las series).',
    shape: { id: z.string() },
    run: async (src, { id }) => {
      const data = await src.load();
      const w = data.workouts.find((x) => x.id === id);
      if (!w) return `No existe el entrenamiento ${id}`;
      const ex = new Map(data.exercises.map((e) => [e.id, e]));
      return json({ ...w, exercises: w.exercises.map((e) => ({ exercise: ex.get(e.exerciseId)?.name ?? e.exerciseId, notes: e.notes, sets: e.sets.map((s) => formatSet(s, ex.get(e.exerciseId))) })) });
    },
  }),
  tool({
    name: 'exercise_history',
    description: 'Progresión de un ejercicio a lo largo del tiempo (mejor peso, 1RM estimado, volumen por sesión).',
    shape: { exercise: z.string().describe('Nombre o id del ejercicio') },
    run: async (src, { exercise }) => {
      const data = await src.load();
      const e = resolveExercise(data, exercise);
      if (!e) return `Ejercicio no encontrado: ${exercise}`;
      const h = exerciseHistory(data, e.id).map((s) => ({
        date: s.date.slice(0, 10),
        best_weight: s.bestWeight,
        e1rm: s.best1RM,
        volume: Math.round(s.volume),
        sets: s.sets.map((x) => formatSet(x, e)),
      }));
      return json({ exercise: e.name, sessions: h });
    },
  }),
  tool({
    name: 'period_report',
    description: 'Informe semanal, mensual o anual: entrenos, duración, volumen, series, récords batidos, series por músculo y comparación con el periodo anterior.',
    shape: { period: z.enum(['week', 'month', 'year']).describe('Tipo de periodo'), offset: z.number().int().max(0).optional().describe('0 = actual, -1 = anterior, …') },
    run: async (src, { period: kind, offset }) => {
      const data = await src.load();
      const r = periodReport(data, period(kind, offset ?? 0, data.settings.weekStartsMonday));
      return `${reportToText(r)}\nRacha actual: ${weekStreak(data, data.settings.weekStartsMonday)} semanas seguidas entrenando.`;
    },
  }),
  tool({
    name: 'personal_records',
    description: 'Récords personales por ejercicio.',
    shape: {},
    run: async (src) => json(personalRecords(await src.load())),
  }),
  tool({
    name: 'achievements',
    description: 'Logros del usuario (desbloqueados y progreso de los pendientes).',
    shape: {},
    run: async (src) => json(achievements(await src.load()).map((a) => ({ title: a.title, desc: a.desc, unlocked: a.unlocked, progress: a.progress }))),
  }),
  tool({
    name: 'suggest_next',
    description: 'Sugerencia de sobrecarga progresiva para la próxima sesión de un ejercicio (peso/reps) según la última vez.',
    shape: { exercise: z.string(), target_reps: z.number().int().optional() },
    run: async (src, { exercise, target_reps }) => {
      const data = await src.load();
      const e = resolveExercise(data, exercise);
      if (!e) return `Ejercicio no encontrado: ${exercise}`;
      const s = suggestNext(lastSessionSets(data, e.id), e, target_reps);
      return s ? json({ exercise: e.name, ...s }) : `Sin datos previos de ${e.name}.`;
    },
  }),
  tool({
    name: 'today_plan',
    description: 'Qué rutina toca hoy (siguiente del programa) y recuperación estimada de cada músculo (0-100 %) según los últimos 3 días.',
    shape: {},
    run: async (src) => {
      const data = await src.load();
      const next = nextRoutine(data);
      const ex = new Map(data.exercises.map((e) => [e.id, e.name]));
      return json({
        next_routine: next && { id: next.routine.id, name: next.routine.name, exercises: next.routine.exercises.map((e) => ex.get(e.exerciseId) ?? e.exerciseId), last_done: next.last?.startedAt },
        recovery: muscleRecovery(data).map((r) => ({ muscle: r.muscle, recovered_pct: Math.round(r.recovery * 100), hours_since: Math.round(r.hoursSince), last_sets: r.sets })),
      });
    },
  }),
  tool({
    name: 'strength_levels',
    description: 'Nivel de fuerza orientativo (Principiante → Élite) en los básicos: 1RM estimado frente al peso corporal, o repeticiones en dominadas y fondos.',
    shape: {},
    run: async (src) => {
      const data = await src.load();
      return json({
        bodyweight: latestBodyweight(data) ?? null,
        sex: data.settings.sex ?? 'm',
        levels: strengthLevels(data).map((l) => ({
          exercise: l.exerciseName,
          value: l.value,
          unit: l.unit,
          ratio_bodyweight: l.ratio,
          level: l.level < 0 ? 'Iniciándote' : LEVELS[l.level],
          next: l.next,
        })),
      });
    },
  }),
  tool({
    name: 'list_exercises',
    description: 'Biblioteca de ejercicios disponible (id, nombre, músculo, material).',
    shape: { muscle: z.string().optional() },
    run: async (src, { muscle }) =>
      json((await src.load()).exercises.filter((e) => !muscle || e.muscle === muscle).map(({ id, name, muscle, equipment, kind }) => ({ id, name, muscle, equipment, kind }))),
  }),
  tool({
    name: 'list_routines',
    description: 'Rutinas guardadas.',
    shape: {},
    run: async (src) => {
      const data = await src.load();
      const names = new Map(data.exercises.map((e) => [e.id, e.name]));
      return json(
        data.routines.map((r) => ({
          id: r.id,
          name: r.name,
          notes: r.notes,
          exercises: r.exercises.map((e) => ({ name: names.get(e.exerciseId), sets: e.sets.length, reps: e.sets[0]?.reps, weight: e.sets[0]?.weight, restSec: e.restSec })),
        })),
      );
    },
  }),
  tool({
    name: 'list_programs',
    description: 'Programas predefinidos disponibles (Full body, 5x5, Torso/Pierna, PPL, Arnold, casa, glúteo).',
    shape: {},
    run: async () => json(PROGRAMS.map((p) => ({ id: p.id, name: p.name, level: p.level, daysPerWeek: p.daysPerWeek, goal: p.goal, routines: p.routines.map((r) => r.name) }))),
  }),
  tool({
    name: 'add_program',
    description: 'Guarda un programa predefinido en las rutinas del usuario (crea una carpeta).',
    shape: { id: z.string() },
    write: true,
    run: async (src, { id }) => {
      const p = PROGRAMS.find((x) => x.id === id);
      if (!p) return `Programa desconocido: ${id}`;
      const data = await src.load();
      const { folder, routines } = instantiateProgram(p);
      data.folders.push(folder);
      data.routines.push(...routines);
      return write(src, data, `Programa "${p.name}" guardado (${routines.length} rutinas).`);
    },
  }),
  tool({
    name: 'create_routine',
    description: 'Crea y guarda una rutina nueva. Los ejercicios se buscan por nombre en la biblioteca (o se crean).',
    write: true,
    shape: {
      name: z.string(),
      notes: z.string().optional(),
      exercises: z
        .array(
          z.object({
            name: z.string(),
            sets: z.number().int().min(1).max(20),
            reps: z.number().optional(),
            weight: z.number().optional(),
            durationSec: z.number().optional(),
            restSec: z.number().optional(),
            notes: z.string().optional(),
            superset: z.string().optional().describe('Mismo valor en ejercicios consecutivos = superserie'),
          }),
        )
        .min(1),
    },
    run: async (src, draft) => {
      const data = await src.load();
      const r = routineFromDraft(data, draft);
      data.routines.push(r);
      return write(src, data, `Rutina "${r.name}" creada (id ${r.id}).`);
    },
  }),
  tool({
    name: 'log_workout',
    description: 'Registra un entrenamiento ya realizado.',
    write: true,
    shape: {
      name: z.string(),
      date: z.string().optional().describe('ISO; por defecto ahora'),
      duration_min: z.number().optional(),
      notes: z.string().optional(),
      exercises: z
        .array(
          z.object({
            name: z.string(),
            sets: z
              .array(
                z.object({
                  weight: z.number().optional(),
                  reps: z.number().optional(),
                  rpe: z.number().optional(),
                  durationSec: z.number().optional(),
                  distanceM: z.number().optional(),
                  type: z.enum(['normal', 'warmup', 'drop', 'failure']).optional(),
                }),
              )
              .min(1),
          }),
        )
        .min(1),
    },
    run: async (src, { name, date, duration_min, notes, exercises }) => {
      const data = await src.load();
      const start = date ? new Date(date) : new Date();
      const w: Workout = {
        id: uid(),
        name,
        notes,
        startedAt: start.toISOString(),
        endedAt: new Date(start.getTime() + (duration_min ?? 60) * 60000).toISOString(),
        exercises: exercises.map((e) => ({ exerciseId: findOrCreateExercise(data, e.name).id, sets: e.sets.map((s) => ({ ...s, type: s.type ?? 'normal', done: true })) })),
      };
      data.workouts.push(w);
      return write(src, data, `Entrenamiento registrado (id ${w.id}, volumen ${workoutVolume(w, data.exercises)} kg).`);
    },
  }),
  tool({
    name: 'log_measurement',
    description: 'Registra peso corporal y/o % de grasa.',
    write: true,
    shape: { bodyweight: z.number().optional(), body_fat: z.number().optional(), date: z.string().optional() },
    run: async (src, { bodyweight, body_fat, date }) => {
      const data = await src.load();
      data.measurements.push({ id: uid(), date: date ? new Date(date).toISOString() : new Date().toISOString(), bodyweight, bodyFat: body_fat });
      return write(src, data, 'Medición guardada.');
    },
  }),
  tool({
    name: 'import_from_hevy',
    description: 'Importa tus entrenamientos desde la API oficial de Hevy (requiere Hevy Pro y la variable de entorno HEVY_API_KEY en el servidor MCP).',
    write: true,
    shape: {},
    run: async (src) => {
      const key = src.env?.('HEVY_API_KEY');
      if (!key) return 'Falta HEVY_API_KEY en la configuración del servidor MCP.';
      const data = await src.load();
      return write(src, data, hevySummary(convertHevyApiWorkouts(data, await fetchHevyWorkouts(key))));
    },
  }),
];

export async function callTool(src: DataSource, name: string, args: unknown): Promise<{ text: string; isError?: boolean }> {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { text: `Herramienta desconocida: ${name}`, isError: true };
  const parsed = z.object(t.shape).safeParse(args ?? {});
  if (!parsed.success) return { text: `Argumentos no válidos: ${parsed.error.message}`, isError: true };
  try {
    return { text: await t.run(src, parsed.data) };
  } catch (e) {
    return { text: (e as Error).message, isError: true };
  }
}

export const toolJsonSchema = (t: ToolDef) => z.toJSONSchema(z.object(t.shape)) as Record<string, unknown>;
