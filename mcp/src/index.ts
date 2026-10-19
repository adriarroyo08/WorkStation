// Servidor MCP (stdio) de Workstation.
// Expone tus entrenamientos a cualquier cliente MCP (Claude Desktop, Cursor, LM Studio, etc.).
// Los datos viven en un fichero JSON (el mismo formato que exporta/importa la app).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { findOrCreateExercise, routineFromDraft } from '../../shared/data';
import { convertHevyApiWorkouts, fetchHevyWorkouts } from '../../shared/hevy';
import { period, periodReport, reportToText, weekStreak } from '../../shared/reports';
import { PROGRAMS, instantiateProgram } from '../../shared/templates';
import { achievements } from '../../shared/achievements';
import { suggestNext } from '../../shared/progression';
import { lastSessionSets } from '../../shared/stats';
import { exerciseHistory, formatSet, personalRecords, trainingSummary, workoutDurationMin, workoutVolume } from '../../shared/stats';
import { uid, type Workout } from '../../shared/types';
import { dataPath, loadData, saveData } from './store';

const server = new McpServer({ name: 'workstation', version: '0.2.0' });

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const json = (v: unknown) => text(JSON.stringify(v, null, 2));

function resolveExercise(data: ReturnType<typeof loadData>, q: string) {
  const s = q.toLowerCase();
  return data.exercises.find((e) => e.id === q) ?? data.exercises.find((e) => e.name.toLowerCase() === s) ?? data.exercises.find((e) => e.name.toLowerCase().includes(s));
}

server.registerTool(
  'training_summary',
  { description: 'Resumen en texto del historial de entrenamiento: últimos entrenamientos, récords y peso corporal. Úsalo primero para tener contexto.', inputSchema: { last_n: z.number().int().min(1).max(100).optional().describe('Nº de entrenamientos recientes (por defecto 10)') } },
  async ({ last_n }) => text(trainingSummary(loadData(), last_n ?? 10)),
);

server.registerTool(
  'list_workouts',
  { description: 'Lista entrenamientos (más recientes primero) con fecha, duración, volumen y ejercicios.', inputSchema: { limit: z.number().int().min(1).max(200).optional(), since: z.string().optional().describe('Fecha ISO mínima, p.ej. 2026-09-01') } },
  async ({ limit, since }) => {
    const data = loadData();
    const names = new Map(data.exercises.map((e) => [e.id, e.name]));
    const list = [...data.workouts]
      .filter((w) => !since || w.startedAt >= since)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit ?? 20)
      .map((w) => ({ id: w.id, name: w.name, date: w.startedAt, minutes: workoutDurationMin(w), volume_kg: workoutVolume(w), exercises: w.exercises.map((e) => names.get(e.exerciseId) ?? e.exerciseId) }));
    return json(list);
  },
);

server.registerTool(
  'get_workout',
  { description: 'Detalle completo de un entrenamiento (todas las series).', inputSchema: { id: z.string() } },
  async ({ id }) => {
    const data = loadData();
    const w = data.workouts.find((x) => x.id === id);
    if (!w) return text(`No existe el entrenamiento ${id}`);
    const ex = new Map(data.exercises.map((e) => [e.id, e]));
    return json({ ...w, exercises: w.exercises.map((e) => ({ exercise: ex.get(e.exerciseId)?.name ?? e.exerciseId, notes: e.notes, sets: e.sets.map((s) => formatSet(s, ex.get(e.exerciseId))) })) });
  },
);

server.registerTool(
  'exercise_history',
  { description: 'Progresión de un ejercicio a lo largo del tiempo (mejor peso, 1RM estimado, volumen por sesión).', inputSchema: { exercise: z.string().describe('Nombre o id del ejercicio') } },
  async ({ exercise }) => {
    const data = loadData();
    const e = resolveExercise(data, exercise);
    if (!e) return text(`Ejercicio no encontrado: ${exercise}`);
    const h = exerciseHistory(data, e.id).map((s) => ({ date: s.date.slice(0, 10), best_weight: s.bestWeight, e1rm: s.best1RM, volume: Math.round(s.volume), sets: s.sets.map((x) => formatSet(x, e)) }));
    return json({ exercise: e.name, sessions: h });
  },
);

server.registerTool(
  'period_report',
  {
    description: 'Informe semanal, mensual o anual: entrenos, duración, volumen, series, récords batidos, series por músculo y comparación con el periodo anterior.',
    inputSchema: { period: z.enum(['week', 'month', 'year']).describe('Tipo de periodo'), offset: z.number().int().max(0).optional().describe('0 = actual, -1 = anterior, …') },
  },
  async ({ period: kind, offset }) => {
    const data = loadData();
    const r = periodReport(data, period(kind, offset ?? 0, data.settings.weekStartsMonday));
    return text(`${reportToText(r)}\nRacha actual: ${weekStreak(data, data.settings.weekStartsMonday)} semanas seguidas entrenando.`);
  },
);

server.registerTool(
  'list_programs',
  { description: 'Programas predefinidos disponibles (Full body, 5x5, Torso/Pierna, PPL, Arnold, casa, glúteo).', inputSchema: {} },
  async () => json(PROGRAMS.map((p) => ({ id: p.id, name: p.name, level: p.level, daysPerWeek: p.daysPerWeek, goal: p.goal, routines: p.routines.map((r) => r.name) }))),
);

server.registerTool(
  'add_program',
  { description: 'Guarda un programa predefinido en las rutinas del usuario (crea una carpeta).', inputSchema: { id: z.string() } },
  async ({ id }) => {
    const p = PROGRAMS.find((x) => x.id === id);
    if (!p) return text(`Programa desconocido: ${id}`);
    const data = loadData();
    const { folder, routines } = instantiateProgram(p);
    data.folders.push(folder);
    data.routines.push(...routines);
    saveData(data);
    return text(`Programa "${p.name}" guardado (${routines.length} rutinas).`);
  },
);

server.registerTool('achievements', { description: 'Logros del usuario (desbloqueados y progreso de los pendientes).', inputSchema: {} }, async () =>
  json(achievements(loadData()).map((a) => ({ title: a.title, desc: a.desc, unlocked: a.unlocked, progress: a.progress }))),
);

server.registerTool(
  'suggest_next',
  { description: 'Sugerencia de sobrecarga progresiva para la próxima sesión de un ejercicio (peso/reps) según la última vez.', inputSchema: { exercise: z.string(), target_reps: z.number().int().optional() } },
  async ({ exercise, target_reps }) => {
    const data = loadData();
    const e = resolveExercise(data, exercise);
    if (!e) return text(`Ejercicio no encontrado: ${exercise}`);
    const s = suggestNext(lastSessionSets(data, e.id), e, target_reps);
    return s ? json({ exercise: e.name, ...s }) : text(`Sin datos previos de ${e.name}.`);
  },
);

server.registerTool('personal_records', { description: 'Récords personales por ejercicio.', inputSchema: {} }, async () => json(personalRecords(loadData())));

server.registerTool(
  'list_exercises',
  { description: 'Biblioteca de ejercicios disponible (id, nombre, músculo, material).', inputSchema: { muscle: z.string().optional() } },
  async ({ muscle }) => json(loadData().exercises.filter((e) => !muscle || e.muscle === muscle).map(({ id, name, muscle, equipment, kind }) => ({ id, name, muscle, equipment, kind }))),
);

server.registerTool('list_routines', { description: 'Rutinas guardadas.', inputSchema: {} }, async () => {
  const data = loadData();
  const names = new Map(data.exercises.map((e) => [e.id, e.name]));
  return json(data.routines.map((r) => ({ id: r.id, name: r.name, notes: r.notes, exercises: r.exercises.map((e) => ({ name: names.get(e.exerciseId), sets: e.sets.length, reps: e.sets[0]?.reps, weight: e.sets[0]?.weight, restSec: e.restSec })) })));
});

server.registerTool(
  'create_routine',
  {
    description: 'Crea y guarda una rutina nueva. Los ejercicios se buscan por nombre en la biblioteca (o se crean).',
    inputSchema: {
      name: z.string(),
      notes: z.string().optional(),
      exercises: z.array(z.object({ name: z.string(), sets: z.number().int().min(1).max(20), reps: z.number().optional(), weight: z.number().optional(), durationSec: z.number().optional(), restSec: z.number().optional(), notes: z.string().optional(), superset: z.string().optional().describe('Mismo valor en ejercicios consecutivos = superserie') })).min(1),
    },
  },
  async (draft) => {
    const data = loadData();
    const r = routineFromDraft(data, draft);
    data.routines.push(r);
    saveData(data);
    return text(`Rutina "${r.name}" creada (id ${r.id}). Importa ${dataPath()} en la app para verla.`);
  },
);

server.registerTool(
  'log_workout',
  {
    description: 'Registra un entrenamiento ya realizado.',
    inputSchema: {
      name: z.string(),
      date: z.string().optional().describe('ISO; por defecto ahora'),
      duration_min: z.number().optional(),
      notes: z.string().optional(),
      exercises: z.array(z.object({ name: z.string(), sets: z.array(z.object({ weight: z.number().optional(), reps: z.number().optional(), rpe: z.number().optional(), durationSec: z.number().optional(), distanceM: z.number().optional(), type: z.enum(['normal', 'warmup', 'drop', 'failure']).optional() })).min(1) })).min(1),
    },
  },
  async ({ name, date, duration_min, notes, exercises }) => {
    const data = loadData();
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
    saveData(data);
    return text(`Entrenamiento registrado (id ${w.id}, volumen ${workoutVolume(w)} kg).`);
  },
);

server.registerTool(
  'log_measurement',
  { description: 'Registra peso corporal y/o % de grasa.', inputSchema: { bodyweight: z.number().optional(), body_fat: z.number().optional(), date: z.string().optional() } },
  async ({ bodyweight, body_fat, date }) => {
    const data = loadData();
    data.measurements.push({ id: uid(), date: date ? new Date(date).toISOString() : new Date().toISOString(), bodyweight, bodyFat: body_fat });
    saveData(data);
    return text('Medición guardada.');
  },
);

server.registerTool(
  'import_from_hevy',
  { description: 'Importa tus entrenamientos desde la API oficial de Hevy (requiere Hevy Pro y la variable de entorno HEVY_API_KEY).', inputSchema: {} },
  async () => {
    const key = process.env.HEVY_API_KEY;
    if (!key) return text('Falta HEVY_API_KEY en la configuración del servidor MCP.');
    const data = loadData();
    const n = convertHevyApiWorkouts(data, await fetchHevyWorkouts(key));
    saveData(data);
    return text(`Importados ${n} entrenamientos desde Hevy.`);
  },
);

await server.connect(new StdioServerTransport());
console.error(`workstation-mcp listo. Datos: ${dataPath()}`);
