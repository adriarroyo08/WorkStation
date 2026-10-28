// Datos que el reloj guarda para entrenar sin el móvil: rutinas, biblioteca, lo último que hiciste en cada
// ejercicio e historial reciente. Va por Data Layer (/workstation/library), que limita cada DataItem a 100 KB.
// Los entrenos que se hacen en el reloj vuelven como Workout normales (/workstation/workout/<id>).
import { workoutSetCount, workoutVolume } from './stats';
import type { SetType, Workout, WorkstationData } from './types';

type WSet = { t: SetType; w?: number; r?: number; d?: number };

export interface WatchLibrary {
  v: 1;
  sentAt: number;
  unit: 'kg' | 'lb';
  defaultRest: number;
  exercises: { id: string; name: string; kind: string }[];
  routines: { id: string; name: string; folder?: string; exercises: { id: string; rest: number; ss?: string; sets: WSet[] }[] }[];
  prev: Record<string, WSet[]>;
  recent: { id: string; name: string; start: number; end?: number; sets: number; volume: number }[];
}

const MAX_BYTES = 90_000;
const wset = (s: { type: SetType; weight?: number; reps?: number; durationSec?: number }): WSet => ({ t: s.type, w: s.weight, r: s.reps, d: s.durationSec });

export function buildWatchLibrary(data: WorkstationData, now = Date.now()): WatchLibrary {
  const folders = new Map(data.folders.map((f) => [f.id, f.name]));
  const byDate = [...data.workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  // Última sesión de cada ejercicio (series hechas), empezando por los de las rutinas.
  const prev: Record<string, WSet[]> = {};
  for (const w of byDate)
    for (const e of w.exercises)
      if (!prev[e.exerciseId]) {
        const sets = w.exercises.filter((x) => x.exerciseId === e.exerciseId).flatMap((x) => x.sets.filter((s) => s.done));
        if (sets.length) prev[e.exerciseId] = sets.map(wset);
      }
  const lib: WatchLibrary = {
    v: 1,
    sentAt: now,
    unit: data.settings.unit ?? 'kg',
    defaultRest: data.settings.defaultRestSec,
    exercises: data.exercises.map((e) => ({ id: e.id, name: e.name, kind: e.kind })),
    routines: data.routines.map((r) => ({
      id: r.id,
      name: r.name,
      folder: r.folderId ? folders.get(r.folderId) : undefined,
      exercises: r.exercises.map((e) => ({ id: e.exerciseId, rest: e.restSec, ss: e.supersetId, sets: e.sets.map(wset) })),
    })),
    prev,
    recent: byDate.slice(0, 15).map((w) => ({
      id: w.id,
      name: w.name,
      start: Date.parse(w.startedAt),
      end: w.endedAt ? Date.parse(w.endedAt) : undefined,
      sets: workoutSetCount(w),
      volume: workoutVolume(w, data.exercises),
    })),
  };
  // Con muchísimos datos se recorta primero el historial de ejercicios que no están en ninguna rutina.
  if (JSON.stringify(lib).length > MAX_BYTES) {
    const inRoutines = new Set(lib.routines.flatMap((r) => r.exercises.map((e) => e.id)));
    for (const id of Object.keys(prev)) if (!inRoutines.has(id)) delete prev[id];
    lib.recent = lib.recent.slice(0, 5);
  }
  return lib;
}

// Entreno que llega del reloj: se valida la forma y se quitan los ejercicios que ya no existen.
export function parseWatchWorkout(json: string, data: WorkstationData): Workout | null {
  let w: Workout;
  try {
    w = JSON.parse(json);
  } catch {
    return null;
  }
  if (!w || typeof w.id !== 'string' || typeof w.name !== 'string' || Number.isNaN(Date.parse(w.startedAt)) || !Array.isArray(w.exercises)) return null;
  const known = new Set(data.exercises.map((e) => e.id));
  const exercises = w.exercises
    .filter((e) => e && known.has(e.exerciseId) && Array.isArray(e.sets))
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s && s.done) }))
    .filter((e) => e.sets.length);
  return exercises.length ? { ...w, exercises } : null;
}
