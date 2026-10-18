import { DEFAULT_EXERCISES } from './exercises';
import type { Exercise, Routine, SetType, Workout, WorkstationData } from './types';
import { uid } from './types';

export function emptyData(): WorkstationData {
  return { version: 1, exercises: [...DEFAULT_EXERCISES], routines: [], workouts: [], measurements: [] };
}

// Valida/normaliza un JSON cargado desde fichero (backup, MCP, etc.).
export function normalizeData(input: unknown): WorkstationData {
  const d = (input ?? {}) as Partial<WorkstationData>;
  if (d.version !== undefined && d.version !== 1) throw new Error(`Versión de datos no soportada: ${d.version}`);
  const base = emptyData();
  const exercises = Array.isArray(d.exercises) ? d.exercises : [];
  const known = new Set(exercises.map((e) => e.id));
  return {
    version: 1,
    exercises: [...exercises, ...base.exercises.filter((e) => !known.has(e.id))],
    routines: Array.isArray(d.routines) ? d.routines : [],
    workouts: Array.isArray(d.workouts) ? d.workouts : [],
    measurements: Array.isArray(d.measurements) ? d.measurements : [],
  };
}

// Fusiona `incoming` en `base` sin duplicar ids.
export function mergeData(base: WorkstationData, incoming: WorkstationData): WorkstationData {
  const by = <T extends { id: string }>(a: T[], b: T[]) => {
    const m = new Map(a.map((x) => [x.id, x]));
    for (const x of b) m.set(x.id, x);
    return [...m.values()];
  };
  return {
    version: 1,
    exercises: by(base.exercises, incoming.exercises),
    routines: by(base.routines, incoming.routines),
    workouts: by(base.workouts, incoming.workouts),
    measurements: by(base.measurements, incoming.measurements),
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Busca un ejercicio por nombre (sin distinguir mayúsculas/acentos) o lo crea como personalizado.
export function findOrCreateExercise(data: WorkstationData, name: string): Exercise {
  const key = slug(name);
  const hit = data.exercises.find((e) => e.id === key || slug(e.name) === key);
  if (hit) return hit;
  const ex: Exercise = { id: `custom-${key || uid()}`, name, muscle: 'cuerpo_completo', equipment: 'otro', kind: 'weight_reps', custom: true };
  data.exercises.push(ex);
  return ex;
}

// Rutina en formato "plano" que puede generar una IA o una herramienta MCP.
export interface RoutineDraft {
  name: string;
  notes?: string;
  exercises: { name: string; sets: number; reps?: number; weight?: number; durationSec?: number; restSec?: number; notes?: string }[];
}

export function routineFromDraft(data: WorkstationData, draft: RoutineDraft): Routine {
  if (!draft?.name || !Array.isArray(draft.exercises) || !draft.exercises.length) throw new Error('Rutina inválida: falta nombre o ejercicios');
  return {
    id: uid(),
    name: String(draft.name),
    notes: draft.notes,
    exercises: draft.exercises.map((e) => ({
      exerciseId: findOrCreateExercise(data, String(e.name)).id,
      restSec: Number(e.restSec ?? 90),
      notes: e.notes,
      sets: Array.from({ length: Math.max(1, Math.min(20, Number(e.sets) || 3)) }, () => ({
        type: 'normal' as SetType,
        reps: e.reps !== undefined ? Number(e.reps) : undefined,
        weight: e.weight !== undefined ? Number(e.weight) : undefined,
        durationSec: e.durationSec !== undefined ? Number(e.durationSec) : undefined,
      })),
    })),
  };
}

export function workoutFromRoutine(r: Routine): Workout {
  return {
    id: uid(),
    name: r.name,
    routineId: r.id,
    startedAt: new Date().toISOString(),
    exercises: r.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      notes: e.notes,
      sets: e.sets.map((s) => ({ ...s, done: false })),
    })),
  };
}
