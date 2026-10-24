import { DEFAULT_EXERCISES } from './exercises';
import type { Exercise, Routine, SetType, Workout, WorkstationData } from './types';
import { DEFAULT_SETTINGS, uid } from './types';

export function emptyData(): WorkstationData {
  return { version: 1, exercises: structuredClone(DEFAULT_EXERCISES), routines: [], folders: [], workouts: [], measurements: [], settings: { ...DEFAULT_SETTINGS } };
}

// Valida/normaliza un JSON cargado desde fichero (backup, MCP, versiones antiguas…).
// Los ejercicios de la biblioteca base se refrescan con su definición actual (nombre, imágenes…)
// conservando lo que el usuario haya personalizado (nota fija).
export function normalizeData(input: unknown): WorkstationData {
  const d = (input ?? {}) as Partial<WorkstationData>;
  if (d.version !== undefined && d.version !== 1) throw new Error(`Versión de datos no soportada: ${d.version}`);
  const defaults = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]));
  const stored = Array.isArray(d.exercises) ? d.exercises : [];
  const storedIds = new Set(stored.map((e) => e.id));
  const exercises: Exercise[] = [
    ...stored.map((e) => {
      const def = defaults.get(e.id);
      return def && !e.custom ? { ...structuredClone(def), ...(e.stickyNote ? { stickyNote: e.stickyNote } : {}), ...(e.exdbId ? { exdbId: e.exdbId } : {}) } : e;
    }),
    ...DEFAULT_EXERCISES.filter((e) => !storedIds.has(e.id)).map((e) => structuredClone(e)),
  ];
  return {
    version: 1,
    exercises,
    routines: Array.isArray(d.routines) ? d.routines : [],
    folders: Array.isArray(d.folders) ? d.folders : [],
    workouts: Array.isArray(d.workouts) ? d.workouts : [],
    measurements: Array.isArray(d.measurements) ? d.measurements : [],
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
  };
}

// Fusiona `incoming` en `base` sin duplicar ids: añade lo que falta y, si un elemento existe en los dos,
// gana el local (importar un backup antiguo no deshace ediciones posteriores; las herramientas MCP solo añaden).
// En los ejercicios se combinan campos para no perder la nota fija, el GIF elegido o las instrucciones traducidas.
export function mergeData(base: WorkstationData, incoming: WorkstationData): WorkstationData {
  const by = <T extends { id: string }>(a: T[], b: T[]) => {
    const m = new Map(a.map((x) => [x.id, x]));
    for (const x of b) if (!m.has(x.id)) m.set(x.id, x);
    return [...m.values()];
  };
  const incomingEx = new Map(incoming.exercises.map((e) => [e.id, e]));
  const exercises = by(base.exercises, incoming.exercises).map((e) => {
    const other = incomingEx.get(e.id);
    if (!other || other === e) return e;
    return { ...e, stickyNote: e.stickyNote ?? other.stickyNote, exdbId: e.exdbId ?? other.exdbId, instructions: e.instructions ?? other.instructions };
  });
  return {
    version: 1,
    exercises,
    routines: by(base.routines, incoming.routines),
    folders: by(base.folders, incoming.folders),
    workouts: by(base.workouts, incoming.workouts),
    measurements: by(base.measurements, incoming.measurements),
    settings: base.settings,
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
  const ex: Exercise = { id: `custom-${key || uid()}`, name, muscle: 'otro', equipment: 'otro', kind: 'weight_reps', custom: true };
  data.exercises.push(ex);
  return ex;
}

// Rutina en formato "plano" que puede generar una IA o una herramienta MCP.
export interface RoutineDraft {
  name: string;
  notes?: string;
  exercises: { name: string; sets: number; reps?: number; weight?: number; durationSec?: number; restSec?: number; notes?: string; superset?: string }[];
}

export function routineFromDraft(data: WorkstationData, draft: RoutineDraft, folderId?: string): Routine {
  if (!draft?.name || !Array.isArray(draft.exercises) || !draft.exercises.length) throw new Error('Rutina inválida: falta nombre o ejercicios');
  return {
    id: uid(),
    name: String(draft.name),
    notes: draft.notes,
    folderId,
    exercises: draft.exercises.map((e) => ({
      exerciseId: findOrCreateExercise(data, String(e.name)).id,
      restSec: Number(e.restSec ?? data.settings?.defaultRestSec ?? 90),
      notes: e.notes,
      supersetId: e.superset,
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
      restSec: e.restSec,
      supersetId: e.supersetId,
      sets: e.sets.map((s) => ({ ...s, done: false })),
    })),
  };
}

// "Guardar como rutina" a partir de un entrenamiento hecho.
export function routineFromWorkout(w: Workout, defaultRest = 90): Routine {
  return {
    id: uid(),
    name: w.name,
    notes: w.notes,
    exercises: w.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      restSec: e.restSec ?? defaultRest,
      supersetId: e.supersetId,
      sets: e.sets.map(({ type, weight, reps, durationSec, distanceM }) => ({ type, weight, reps, durationSec, distanceM })),
    })),
  };
}

// Repetir un entrenamiento pasado como nuevo entrenamiento en curso.
export function repeatWorkout(w: Workout): Workout {
  return {
    id: uid(),
    name: w.name,
    routineId: w.routineId,
    startedAt: new Date().toISOString(),
    exercises: w.exercises.map((e) => ({ ...structuredClone(e), sets: e.sets.map((s) => ({ ...s, rpe: undefined, done: false })) })),
  };
}
