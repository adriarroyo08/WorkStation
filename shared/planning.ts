// Planificación: qué rutina toca hoy, cómo de recuperado está cada músculo y comparación con la sesión anterior.
import { countsAsWorkSet, workoutDurationMin, workoutReps, workoutSetCount, workoutVolume } from './stats';
import type { MuscleGroup, Routine, Workout, WorkstationData } from './types';

const byDateDesc = (a: Workout, b: Workout) => b.startedAt.localeCompare(a.startedAt);

/**
 * Siguiente rutina del programa: dentro de la carpeta de la última rutina hecha, la que va después (en orden circular).
 * Si la última sesión fue de una rutina suelta, sugiere la suelta que lleva más tiempo sin hacerse.
 */
export function nextRoutine(data: WorkstationData): { routine: Routine; last?: Workout } | null {
  const usable = data.routines.filter((r) => r.exercises.length);
  if (!usable.length) return null;
  const done = data.workouts.filter((w) => w.routineId && usable.some((r) => r.id === w.routineId)).sort(byDateDesc);
  const last = done[0];
  if (!last) return { routine: usable[0] };
  const lastRoutine = usable.find((r) => r.id === last.routineId)!;
  const group = usable.filter((r) => (r.folderId ?? '') === (lastRoutine.folderId ?? ''));
  if (lastRoutine.folderId && group.length > 1) {
    const routine = group[(group.indexOf(lastRoutine) + 1) % group.length];
    return { routine, last: done.find((w) => w.routineId === routine.id) };
  }
  // Rutinas sueltas: la que hace más tiempo que no se entrena (nunca hecha = la más antigua).
  const lastDone = (r: Routine) => done.find((w) => w.routineId === r.id)?.startedAt ?? '';
  const routine = [...group].sort((a, b) => lastDone(a).localeCompare(lastDone(b)))[0];
  return { routine, last: done.find((w) => w.routineId === routine.id) };
}

export interface MuscleRecovery {
  muscle: MuscleGroup;
  // 0 = recién entrenado, 1 = recuperado del todo.
  recovery: number;
  hoursSince: number;
  sets: number;
}

// Horas para recuperarse: 36 h base, más 4 h por cada serie efectiva por encima de 4 (máx. 72 h).
export const recoveryHours = (sets: number) => Math.min(72, 36 + Math.max(0, sets - 4) * 4);

const SKIP = new Set<MuscleGroup>(['cardio', 'cuerpo_completo', 'otro']);

/** Recuperación de cada músculo trabajado en los últimos 3 días, de menos a más recuperado. */
export function muscleRecovery(data: WorkstationData, now = Date.now()): MuscleRecovery[] {
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const since = now - 72 * 3600_000;
  // Fatiga acumulada: cada sesión aporta las series pendientes de recuperar, en proporción al tiempo restante.
  const acc = new Map<MuscleGroup, { load: number; lastAt: number; sets: number }>();
  for (const w of data.workouts) {
    const at = Date.parse(w.endedAt ?? w.startedAt);
    if (at < since || at > now) continue;
    const per = new Map<MuscleGroup, number>();
    for (const we of w.exercises) {
      const e = ex.get(we.exerciseId);
      const n = we.sets.filter(countsAsWorkSet).length;
      if (!e || !n) continue;
      per.set(e.muscle, (per.get(e.muscle) ?? 0) + n);
      for (const s of e.secondary ?? []) per.set(s, (per.get(s) ?? 0) + n / 2);
    }
    for (const [m, sets] of per) {
      if (SKIP.has(m)) continue;
      const h = (now - at) / 3600_000;
      const left = Math.max(0, 1 - h / recoveryHours(sets));
      const cur = acc.get(m) ?? { load: 0, lastAt: 0, sets: 0 };
      cur.load += left;
      if (at > cur.lastAt) Object.assign(cur, { lastAt: at, sets });
      acc.set(m, cur);
    }
  }
  return [...acc.entries()]
    .map(([muscle, a]) => ({ muscle, recovery: Math.max(0, 1 - a.load), hoursSince: (now - a.lastAt) / 3600_000, sets: a.sets }))
    .filter((r) => r.recovery < 1)
    .sort((a, b) => a.recovery - b.recovery);
}

export interface Comparison {
  previous: Workout;
  volume: [number, number];
  sets: [number, number];
  reps: [number, number];
  durationMin: [number, number];
}

/** Compara un entreno con la sesión anterior de la misma rutina (o, sin rutina, con el mismo nombre). */
export function compareWithPrevious(data: WorkstationData, workoutId: string): Comparison | null {
  const w = data.workouts.find((x) => x.id === workoutId);
  if (!w) return null;
  const same = (x: Workout) => (w.routineId ? x.routineId === w.routineId : x.name === w.name);
  const previous = data.workouts.filter((x) => x.id !== w.id && x.startedAt < w.startedAt && same(x)).sort(byDateDesc)[0];
  if (!previous) return null;
  return {
    previous,
    volume: [workoutVolume(w, data.exercises), workoutVolume(previous, data.exercises)],
    sets: [workoutSetCount(w), workoutSetCount(previous)],
    reps: [workoutReps(w), workoutReps(previous)],
    durationMin: [workoutDurationMin(w), workoutDurationMin(previous)],
  };
}
