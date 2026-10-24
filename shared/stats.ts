import { DEFAULT_EXERCISES, MUSCLE_LABELS } from './exercises';
import { fmtWeight } from './units';
import type { Exercise, ExerciseKind, MuscleGroup, Workout, WorkoutSet, WorkstationData } from './types';

// 1RM estimado (fórmula de Epley).
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export const countsAsWorkSet = (s: WorkoutSet) => s.done && s.type !== 'warmup';

const byDate = (a: Workout, b: Workout) => a.startedAt.localeCompare(b.startedAt);

// Kg que cuentan como carga levantada. En los ejercicios asistidos el peso es la AYUDA de la máquina:
// no es carga (más ayuda = más fácil), así que no suma volumen ni récords de peso.
const DEFAULT_KIND = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e.kind]));
const kindOf = (id: string, exercises?: Exercise[]): ExerciseKind => exercises?.find((e) => e.id === id)?.kind ?? DEFAULT_KIND.get(id) ?? 'weight_reps';
export const loadKg = (s: WorkoutSet, kind: ExerciseKind) => (kind === 'assisted' ? 0 : (s.weight ?? 0));

/** Volumen (kg × reps de las series efectivas). Pasa `exercises` para reconocer los asistidos personalizados. */
export function workoutVolume(w: Workout, exercises?: Exercise[]): number {
  let v = 0;
  for (const ex of w.exercises) {
    const kind = kindOf(ex.exerciseId, exercises);
    for (const s of ex.sets) if (countsAsWorkSet(s)) v += loadKg(s, kind) * (s.reps ?? 0);
  }
  return Math.round(v);
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((n, ex) => n + ex.sets.filter(countsAsWorkSet).length, 0);
}

export function workoutReps(w: Workout): number {
  return w.exercises.reduce((n, ex) => n + ex.sets.filter(countsAsWorkSet).reduce((r, s) => r + (s.reps ?? 0), 0), 0);
}

export function workoutDurationMin(w: Workout): number {
  if (!w.endedAt) return 0;
  return Math.max(0, Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000));
}

export interface ExerciseSession {
  workoutId: string;
  date: string;
  sets: WorkoutSet[];
  bestWeight: number;
  best1RM: number;
  bestSetVolume: number;
  volume: number;
  maxReps: number;
  totalReps: number;
  maxDuration: number;
  maxDistance: number;
}

// Caché por versión de los datos: el store sustituye `workouts`/`exercises` por copias nuevas en cada cambio,
// así que la identidad de esos arrays (y la longitud, por si se muta in situ) sirve de clave.
const memoStore = new WeakMap<object, { len: number; exercises: unknown; values: Map<string, unknown> }>();
function memo<T>(data: WorkstationData, key: string, compute: () => T): T {
  let entry = memoStore.get(data.workouts);
  if (!entry || entry.len !== data.workouts.length || entry.exercises !== data.exercises) {
    entry = { len: data.workouts.length, exercises: data.exercises, values: new Map() };
    memoStore.set(data.workouts, entry);
  }
  if (!entry.values.has(key)) entry.values.set(key, compute());
  return entry.values.get(key) as T;
}

export function exerciseHistory(data: WorkstationData, exerciseId: string): ExerciseSession[] {
  return memo(data, `h:${exerciseId}`, () => computeExerciseHistory(data, exerciseId));
}

function computeExerciseHistory(data: WorkstationData, exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  const kind = kindOf(exerciseId, data.exercises);
  // 1RM solo tiene sentido con peso y repeticiones (no con el lastre de un ejercicio de peso corporal).
  const rm = (s: WorkoutSet) => (kind === 'weight_reps' ? estimate1RM(s.weight ?? 0, s.reps ?? 0) : 0);
  for (const w of data.workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const sets = ex.sets.filter(countsAsWorkSet);
      if (!sets.length) continue;
      out.push({
        workoutId: w.id,
        date: w.startedAt,
        sets,
        bestWeight: Math.max(0, ...sets.map((s) => loadKg(s, kind))),
        best1RM: Math.max(0, ...sets.map(rm)),
        bestSetVolume: Math.max(0, ...sets.map((s) => loadKg(s, kind) * (s.reps ?? 0))),
        volume: sets.reduce((v, s) => v + loadKg(s, kind) * (s.reps ?? 0), 0),
        maxReps: Math.max(0, ...sets.map((s) => s.reps ?? 0)),
        totalReps: sets.reduce((v, s) => v + (s.reps ?? 0), 0),
        maxDuration: Math.max(0, ...sets.map((s) => s.durationSec ?? 0)),
        maxDistance: Math.max(0, ...sets.map((s) => s.distanceM ?? 0)),
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Series (incluido calentamiento) de la última sesión anterior a `before` en la que se hizo el ejercicio.
export function lastSessionSets(data: WorkstationData, exerciseId: string, before?: string, excludeId?: string): WorkoutSet[] {
  const ws = data.workouts.filter((w) => w.id !== excludeId && (!before || w.startedAt < before)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const w of ws) {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter((s) => s.done));
    if (sets.length) return sets;
  }
  return [];
}

// Empareja cada serie con la equivalente de la sesión anterior: el n-ésimo calentamiento con el n-ésimo
// calentamiento y la n-ésima serie efectiva con la n-ésima efectiva.
export function alignPrevious(sets: { type: WorkoutSet['type'] }[], prev: WorkoutSet[]): (WorkoutSet | undefined)[] {
  const pw = prev.filter((s) => s.type === 'warmup');
  const pn = prev.filter((s) => s.type !== 'warmup');
  let w = 0,
    n = 0;
  return sets.map((s) => (s.type === 'warmup' ? pw[w++] : pn[n++]));
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  bestWeight: number;
  best1RM: number;
  maxReps: number;
  bestSetVolume: number;
  bestVolumeSession: number;
  maxDuration: number;
  maxDistance: number;
  sessions: number;
  lastDate: string;
}

export function personalRecords(data: WorkstationData): PersonalRecord[] {
  return memo(data, 'prs', () => computePersonalRecords(data));
}

function computePersonalRecords(data: WorkstationData): PersonalRecord[] {
  const names = new Map(data.exercises.map((e) => [e.id, e.name]));
  const ids = new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)));
  const prs: PersonalRecord[] = [];
  for (const id of ids) {
    const h = exerciseHistory(data, id);
    if (!h.length) continue;
    const max = (k: keyof ExerciseSession) => Math.max(...h.map((s) => s[k] as number));
    prs.push({
      exerciseId: id,
      exerciseName: names.get(id) ?? id,
      bestWeight: max('bestWeight'),
      best1RM: max('best1RM'),
      maxReps: max('maxReps'),
      bestSetVolume: Math.round(max('bestSetVolume')),
      bestVolumeSession: Math.round(max('volume')),
      maxDuration: max('maxDuration'),
      maxDistance: max('maxDistance'),
      sessions: h.length,
      lastDate: h[h.length - 1].date,
    });
  }
  return prs.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

// Mejor peso levantado para cada número de repeticiones ("récords por serie").
export function repRecords(data: WorkstationData, exerciseId: string, maxReps = 15): { reps: number; weight: number; date: string }[] {
  const best = new Map<number, { weight: number; date: string }>();
  if (kindOf(exerciseId, data.exercises) === 'assisted') return []; // la ayuda no es un récord de peso
  for (const s of exerciseHistory(data, exerciseId))
    for (const set of s.sets) {
      const r = set.reps ?? 0;
      const w = set.weight ?? 0;
      if (r < 1 || r > maxReps || w <= 0) continue;
      if (!best.has(r) || best.get(r)!.weight < w) best.set(r, { weight: w, date: s.date });
    }
  return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([reps, v]) => ({ reps, ...v }));
}

export type PrKind = 'weight' | '1rm' | 'setVolume' | 'reps' | 'duration' | 'distance';
export const PR_LABELS: Record<PrKind, string> = {
  weight: 'Peso máximo',
  '1rm': '1RM estimado',
  setVolume: 'Mejor serie (volumen)',
  reps: 'Más repeticiones',
  duration: 'Más tiempo',
  distance: 'Más distancia',
};

export interface PrEvent {
  workoutId: string;
  exerciseId: string;
  date: string;
  kind: PrKind;
  value: number;
  previous: number;
}

function setMetrics(s: WorkoutSet, ex?: Exercise): Partial<Record<PrKind, number>> {
  const k = ex?.kind ?? 'weight_reps';
  if (k === 'duration') return { duration: s.durationSec ?? 0 };
  if (k === 'distance') return { distance: s.distanceM ?? 0 };
  if (k === 'assisted') return { reps: s.reps ?? 0 };
  if (k === 'reps') return { reps: s.reps ?? 0, ...(s.weight ? { weight: s.weight } : {}) };
  return { weight: s.weight ?? 0, '1rm': estimate1RM(s.weight ?? 0, s.reps ?? 0), setVolume: (s.weight ?? 0) * (s.reps ?? 0) };
}

// Recorre el historial en orden y devuelve cada vez que se batió un récord.
// La primera sesión de un ejercicio no cuenta como récord (no hay con qué comparar).
export function prEvents(data: WorkstationData, extra?: Workout): PrEvent[] {
  return extra ? computePrEvents(data, extra) : memo(data, 'pre', () => computePrEvents(data));
}

function computePrEvents(data: WorkstationData, extra?: Workout): PrEvent[] {
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const bests = new Map<string, Partial<Record<PrKind, number>>>();
  const events: PrEvent[] = [];
  const all = extra ? [...data.workouts.filter((w) => w.id !== extra.id), extra] : data.workouts;
  for (const w of [...all].sort(byDate)) {
    for (const we of w.exercises) {
      const sessionBest: Partial<Record<PrKind, number>> = {};
      for (const s of we.sets.filter(countsAsWorkSet))
        for (const [k, v] of Object.entries(setMetrics(s, ex.get(we.exerciseId))) as [PrKind, number][]) sessionBest[k] = Math.max(sessionBest[k] ?? 0, v);
      if (!Object.keys(sessionBest).length) continue;
      const prev = bests.get(we.exerciseId);
      if (!prev) {
        bests.set(we.exerciseId, sessionBest);
        continue;
      }
      for (const [k, v] of Object.entries(sessionBest) as [PrKind, number][]) {
        const p = prev[k] ?? 0;
        if (v > 0 && v > p) {
          if (p > 0) events.push({ workoutId: w.id, exerciseId: we.exerciseId, date: w.startedAt, kind: k, value: Math.round(v * 10) / 10, previous: Math.round(p * 10) / 10 });
          prev[k] = v;
        }
      }
    }
  }
  return events;
}

// Series efectivas por músculo (el principal cuenta 1, los secundarios 0,5).
export function muscleSets(data: WorkstationData, workouts: Workout[], includeSecondary = true): Partial<Record<MuscleGroup, number>> {
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const w of workouts)
    for (const we of w.exercises) {
      const e = ex.get(we.exerciseId);
      const n = we.sets.filter(countsAsWorkSet).length;
      if (!n) continue;
      const m = e?.muscle ?? 'otro';
      out[m] = (out[m] ?? 0) + n;
      if (includeSecondary) for (const s of e?.secondary ?? []) out[s] = (out[s] ?? 0) + n / 2;
    }
  return out;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h) return m ? `${h}h ${m}m` : `${h}h`;
  if (m) return s ? `${m}min ${s}s` : `${m}min`;
  return `${s}s`;
}

export function formatSet(s: WorkoutSet, ex?: Exercise): string {
  const tag = s.type === 'warmup' ? ' (calent.)' : s.type === 'drop' ? ' (drop)' : s.type === 'failure' ? ' (fallo)' : '';
  const rpe = s.rpe ? ` @RPE${s.rpe}` : '';
  if (ex?.kind === 'duration' || (s.durationSec && !s.reps && !s.distanceM)) return `${formatDuration(s.durationSec ?? 0)}${s.weight ? ` con ${fmtWeight(s.weight, { space: false })}` : ''}${tag}`;
  if (ex?.kind === 'distance' || (s.distanceM && !s.reps)) return `${s.distanceM ?? 0}m${s.durationSec ? ` en ${formatDuration(s.durationSec)}` : ''}${tag}`;
  if (ex?.kind === 'assisted') return `${s.reps ?? 0} reps${s.weight ? ` (asist. ${fmtWeight(s.weight, { space: false })})` : ''}${rpe}${tag}`;
  const w = s.weight ? `${fmtWeight(s.weight, { space: false })} × ` : '';
  return `${w}${s.reps ?? 0}${rpe}${tag}`;
}

// Resumen en texto plano para dar contexto a un modelo de IA.
export function trainingSummary(data: WorkstationData, lastN = 10): string {
  const names = new Map(data.exercises.map((e) => [e.id, e]));
  const recent = [...data.workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, lastN);
  const lines: string[] = [];
  lines.push(`Entrenamientos totales registrados: ${data.workouts.length}. Objetivo semanal: ${data.settings?.weeklyGoal ?? 3} entrenos.`);
  const lastBw = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date)).find((m) => m.bodyweight);
  if (lastBw) lines.push(`Peso corporal más reciente: ${lastBw.bodyweight} kg (${lastBw.date.slice(0, 10)}).`);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString();
  const ms = muscleSets(
    data,
    data.workouts.filter((w) => w.startedAt >= monthAgo),
    false,
  );
  const msTxt = Object.entries(ms)
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${MUSCLE_LABELS[m as MuscleGroup]} ${n}`)
    .join(', ');
  if (msTxt) lines.push(`Series por músculo (últimos 30 días): ${msTxt}.`);
  lines.push('', `Últimos ${recent.length} entrenamientos:`);
  for (const w of recent) {
    lines.push(`- ${w.startedAt.slice(0, 10)} "${w.name}" (${workoutDurationMin(w)} min, volumen ${workoutVolume(w, data.exercises)} kg)`);
    for (const ex of w.exercises) {
      const e = names.get(ex.exerciseId);
      const sets = ex.sets
        .filter((s) => s.done)
        .map((s) => formatSet(s, e))
        .join(', ');
      lines.push(`    ${e?.name ?? ex.exerciseId}: ${sets}`);
    }
  }
  const prs = personalRecords(data)
    .filter((p) => p.best1RM > 0)
    .slice(0, 30);
  if (prs.length) {
    lines.push('', 'Récords (1RM estimado / peso máximo):');
    for (const p of prs) lines.push(`- ${p.exerciseName}: ${p.best1RM} kg e1RM, ${p.bestWeight} kg máx.`);
  }
  return lines.join('\n');
}
