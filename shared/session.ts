// Lógica del entrenamiento en curso, compartida por la pantalla del móvil y los comandos del reloj.
import { alignPrevious, lastSessionSets } from './stats';
import type { Routine, Workout, WorkoutSet, WorkstationData } from './types';

export interface SetOverrides {
  weight?: number;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
}

// Marca/desmarca una serie. Si no escribiste nada, usa los valores de la sesión anterior (como Hevy).
// Devuelve el entrenamiento nuevo y los segundos de descanso que hay que iniciar (0 = ninguno).
export function toggleSet(data: WorkstationData, w: Workout, ei: number, si: number, overrides: SetOverrides = {}, forceDone?: boolean): { workout: Workout; restSec: number } {
  const n = structuredClone(w);
  const we = n.exercises[ei];
  const s = we?.sets[si];
  if (!s) return { workout: w, restSec: 0 };
  const done = forceDone ?? !s.done;
  if (done) {
    const prev = alignPrevious(we.sets, lastSessionSets(data, we.exerciseId, w.startedAt, w.id))[si];
    for (const k of ['weight', 'reps', 'durationSec', 'distanceM'] as const) {
      if (overrides[k] !== undefined) s[k] = overrides[k];
      else if (s[k] === undefined && prev?.[k] !== undefined) s[k] = prev[k];
    }
  }
  const wasDone = s.done;
  s.done = done;
  let restSec = 0;
  if (done && !wasDone) {
    // En superseries el descanso empieza tras el último ejercicio del bloque que aún tenga series pendientes
    // (con A de 4 series y B de 3, tras A4 ya no queda nada de B: toca descansar).
    let chained = false;
    for (let j = ei + 1; we.supersetId && n.exercises[j]?.supersetId === we.supersetId; j++) if (n.exercises[j].sets.some((x) => !x.done)) chained = true;
    restSec = chained ? 0 : (we.restSec ?? data.settings.defaultRestSec);
  }
  return { workout: n, restSec };
}

// Siguiente serie pendiente. En superseries alterna entre ejercicios del bloque (A1, B1, A2, B2…).
export function nextPendingSet(w: Workout): { ei: number; si: number } | null {
  for (let ei = 0; ei < w.exercises.length; ei++) {
    const we = w.exercises[ei];
    const si = we.sets.findIndex((s) => !s.done);
    if (si < 0) continue;
    if (we.supersetId) {
      // Dentro del bloque, elige el ejercicio con menos series hechas (por orden).
      let start = ei;
      while (start > 0 && w.exercises[start - 1].supersetId === we.supersetId) start--;
      let end = ei;
      while (end + 1 < w.exercises.length && w.exercises[end + 1].supersetId === we.supersetId) end++;
      let best: { ei: number; si: number; done: number } | null = null;
      for (let j = start; j <= end; j++) {
        const sj = w.exercises[j].sets.findIndex((s) => !s.done);
        if (sj < 0) continue;
        const doneCount = w.exercises[j].sets.filter((s) => s.done).length;
        if (!best || doneCount < best.done) best = { ei: j, si: sj, done: doneCount };
      }
      if (best) return { ei: best.ei, si: best.si };
    }
    return { ei, si };
  }
  return null;
}

// Cierra el entrenamiento: descarta series sin completar y ejercicios vacíos. null si no queda nada.
export function finishWorkout(w: Workout, endedAt = new Date()): Workout | null {
  const done: Workout = {
    ...w,
    endedAt: endedAt.toISOString(),
    exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length),
  };
  return done.exercises.length ? done : null;
}

/**
 * ¿Hay series sin marcar con datos que se perderían al terminar? Cuenta peso, reps, tiempo y distancia,
 * pero no los valores que venían ya de la rutina (saltarse una serie planificada no es "perder datos").
 */
export function hasPendingData(w: Workout, routine?: Routine): boolean {
  const keys = ['weight', 'reps', 'durationSec', 'distanceM'] as const;
  return w.exercises.some((e, ei) =>
    e.sets.some((s, si) => {
      if (s.done) return false;
      const planned = routine?.exercises[ei]?.exerciseId === e.exerciseId ? routine.exercises[ei].sets[si] : undefined;
      return keys.some((k) => s[k] !== undefined && s[k] !== (planned as Partial<WorkoutSet> | undefined)?.[k]);
    }),
  );
}

// ---- Protocolo con el reloj (Wear OS) ----

export interface WatchSet {
  type: WorkoutSet['type'];
  weight?: number;
  reps?: number;
  durationSec?: number;
  done: boolean;
  prevWeight?: number;
  prevReps?: number;
}

export interface WatchState {
  v: 1;
  sentAt: number;
  // Unidad visible en el reloj; los pesos viajan siempre en kg.
  unit: 'kg' | 'lb';
  active: null | {
    id: string;
    name: string;
    startedAt: number;
    restEnd: number | null;
    restTotal: number;
    cursor: { ei: number; si: number } | null;
    setsDone: number;
    setsTotal: number;
    exercises: { name: string; kind: string; superset: boolean; sets: WatchSet[] }[];
  };
  routines: { id: string; name: string; exercises: number }[];
}

export function buildWatchState(data: WorkstationData, w: Workout | null, rest: { end: number | null; total: number }, now = Date.now()): WatchState {
  const names = new Map(data.exercises.map((e) => [e.id, e]));
  const routines = [...data.routines].slice(0, 20).map((r: Routine) => ({ id: r.id, name: r.name, exercises: r.exercises.length }));
  const unit = data.settings.unit ?? 'kg';
  if (!w) return { v: 1, sentAt: now, unit, active: null, routines };
  const all = w.exercises.flatMap((e) => e.sets);
  return {
    v: 1,
    sentAt: now,
    unit,
    routines,
    active: {
      id: w.id,
      name: w.name,
      startedAt: Date.parse(w.startedAt),
      restEnd: rest.end && rest.end > now ? rest.end : null,
      restTotal: rest.total,
      cursor: nextPendingSet(w),
      setsDone: all.filter((s) => s.done).length,
      setsTotal: all.length,
      exercises: w.exercises.map((we) => {
        const ex = names.get(we.exerciseId);
        const prev = alignPrevious(we.sets, lastSessionSets(data, we.exerciseId, w.startedAt, w.id));
        return {
          name: ex?.name ?? we.exerciseId,
          kind: ex?.kind ?? 'weight_reps',
          superset: !!we.supersetId,
          sets: we.sets.map((s, i) => ({ type: s.type, weight: s.weight, reps: s.reps, durationSec: s.durationSec, done: s.done, prevWeight: prev[i]?.weight, prevReps: prev[i]?.reps })),
        };
      }),
    },
  };
}

export type WatchCommand =
  | { type: 'hello' }
  // wid/ex: entreno y nombre del ejercicio que veía el reloj (opcionales para relojes antiguos).
  | { type: 'complete_set'; ei: number; si: number; wid?: string; ex?: string; weight?: number; reps?: number; durationSec?: number }
  | { type: 'uncomplete_set'; ei: number; si: number; wid?: string; ex?: string }
  | { type: 'rest_add'; sec: number }
  | { type: 'rest_skip' }
  | { type: 'start_routine'; id: string }
  | { type: 'start_empty' }
  | { type: 'finish' }
  | { type: 'hr'; bpm: number };

export function parseWatchCommand(raw: string): WatchCommand | null {
  try {
    const c = JSON.parse(raw) as WatchCommand;
    return c && typeof c.type === 'string' ? c : null;
  } catch {
    return null;
  }
}

// Resume las muestras de pulso de un entrenamiento (máx. ~360 puntos para la gráfica).
export function summarizeHeartRate(startedAtMs: number, samples: { t: number; bpm: number }[]): Workout['heartRate'] | undefined {
  const ok = samples.filter((s) => s.bpm >= 30 && s.bpm <= 240 && s.t >= startedAtMs);
  if (ok.length < 2) return undefined;
  const bpms = ok.map((s) => s.bpm);
  const step = Math.max(1, Math.ceil(ok.length / 360));
  return {
    avg: Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length),
    max: Math.max(...bpms),
    min: Math.min(...bpms),
    samples: ok.filter((_, i) => i % step === 0).map((s) => [Math.round((s.t - startedAtMs) / 1000), s.bpm]),
  };
}
