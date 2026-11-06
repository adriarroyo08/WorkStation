// Edición de rutinas guardadas (herramientas MCP update_routine y delete_routine): localizar una rutina
// o un ejercicio dentro de ella y aplicar cambios parciales sin tocar lo que no se menciona.
import { findOrCreateExercise } from './data';
import type { Routine, RoutineExercise, WorkstationData } from './types';

type RoutineSet = RoutineExercise['sets'][number];

export interface ExercisePatch {
  exercise?: string; // nombre o id de un ejercicio de la rutina
  position?: number; // o su posición en la rutina (1 = el primero)
  replace_with?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  durationSec?: number;
  restSec?: number;
  notes?: string;
  superset?: string;
  move_to?: number;
  remove?: boolean;
}

export interface ExerciseAdd {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  durationSec?: number;
  restSec?: number;
  notes?: string;
  superset?: string;
  position?: number;
}

export interface RoutinePatch {
  name?: string;
  notes?: string;
  changes?: ExercisePatch[];
  add?: ExerciseAdd[];
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Por id, por nombre exacto o, si solo hay una, por parte del nombre. `exact` no admite lo último (para borrar).
export function findRoutine(data: WorkstationData, query: string, exact = false): Routine {
  const q = fold(query);
  const byId = data.routines.find((r) => r.id === query);
  if (byId) return byId;
  const same = data.routines.filter((r) => fold(r.name) === q);
  if (same.length === 1) return same[0];
  if (same.length > 1) throw new Error(`Hay ${same.length} rutinas llamadas "${query}": indica el id (${same.map((r) => r.id).join(', ')}).`);
  const names = data.routines.map((r) => `"${r.name}" (${r.id})`).join(', ') || 'ninguna';
  if (exact) throw new Error(`No hay ninguna rutina con id o nombre exacto "${query}". Rutinas: ${names}.`);
  const partial = data.routines.filter((r) => fold(r.name).includes(q));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new Error(`"${query}" coincide con varias rutinas: ${partial.map((r) => `"${r.name}" (${r.id})`).join(', ')}.`);
  throw new Error(`Rutina no encontrada: "${query}". Rutinas: ${names}.`);
}

const exerciseName = (data: WorkstationData, id: string) => data.exercises.find((e) => e.id === id)?.name ?? id;

function findInRoutine(data: WorkstationData, r: Routine, p: ExercisePatch): RoutineExercise {
  const list = r.exercises.map((e, i) => `${i + 1}. ${exerciseName(data, e.exerciseId)}`).join(', ');
  if (p.position !== undefined) {
    const e = r.exercises[p.position - 1];
    if (!e) throw new Error(`La rutina "${r.name}" no tiene posición ${p.position}. Ejercicios: ${list}.`);
    return e;
  }
  if (!p.exercise) throw new Error('Cada cambio necesita "exercise" (nombre o id) o "position".');
  const q = fold(p.exercise);
  const hit =
    r.exercises.find((e) => e.exerciseId === p.exercise) ??
    r.exercises.find((e) => fold(exerciseName(data, e.exerciseId)) === q) ??
    r.exercises.find((e) => fold(exerciseName(data, e.exerciseId)).includes(q));
  if (!hit) throw new Error(`"${p.exercise}" no está en la rutina "${r.name}". Ejercicios: ${list}.`);
  return hit;
}

const clampSets = (n: number) => Math.max(1, Math.min(20, Math.round(n)));

// Series, repeticiones, peso y duración: el nº de series se ajusta por el final (las nuevas copian la última)
// y reps/peso/duración se aplican a las series efectivas (todas menos las de calentamiento, si hay otras).
function applySets(e: RoutineExercise, p: { sets?: number; reps?: number; weight?: number; durationSec?: number }) {
  if (p.sets !== undefined) {
    const n = clampSets(p.sets);
    const last: RoutineSet = e.sets.at(-1) ?? { type: 'normal' };
    e.sets = e.sets.slice(0, n);
    while (e.sets.length < n) e.sets.push({ ...last, type: last.type === 'warmup' ? 'normal' : last.type });
  }
  const working = e.sets.some((s) => s.type !== 'warmup') ? e.sets.filter((s) => s.type !== 'warmup') : e.sets;
  for (const s of working) {
    if (p.reps !== undefined) s.reps = p.reps;
    if (p.weight !== undefined) s.weight = p.weight;
    if (p.durationSec !== undefined) s.durationSec = p.durationSec;
  }
}

const textOrUndefined = (s: string) => (s.trim() ? s : undefined);

const insertAt = <T>(list: T[], item: T, position?: number) => list.splice(position === undefined ? list.length : Math.max(0, Math.min(list.length, position - 1)), 0, item);

// Aplica los cambios en orden sobre `r` (que pertenece a `data`): las posiciones de cada cambio se cuentan
// sobre la rutina tal y como la ha dejado el cambio anterior.
export function applyRoutinePatch(data: WorkstationData, r: Routine, patch: RoutinePatch): string[] {
  const done: string[] = [];
  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new Error('El nombre de la rutina no puede quedar vacío.');
    done.push(`nombre: "${r.name}" → "${patch.name}"`);
    r.name = patch.name;
  }
  if (patch.notes !== undefined) {
    r.notes = textOrUndefined(patch.notes);
    done.push('notas de la rutina');
  }
  for (const p of patch.changes ?? []) {
    const e = findInRoutine(data, r, p);
    const label = exerciseName(data, e.exerciseId);
    if (p.remove) {
      r.exercises.splice(r.exercises.indexOf(e), 1);
      done.push(`quitado ${label}`);
      continue;
    }
    if (p.replace_with) {
      e.exerciseId = findOrCreateExercise(data, p.replace_with).id;
      done.push(`${label} → ${exerciseName(data, e.exerciseId)}`);
    }
    applySets(e, p);
    if (p.restSec !== undefined) e.restSec = Math.max(0, Math.round(p.restSec));
    if (p.notes !== undefined) e.notes = textOrUndefined(p.notes);
    if (p.superset !== undefined) e.supersetId = textOrUndefined(p.superset);
    if (p.move_to !== undefined) {
      r.exercises.splice(r.exercises.indexOf(e), 1);
      insertAt(r.exercises, e, p.move_to);
    }
    const what = (['sets', 'reps', 'weight', 'durationSec', 'restSec', 'notes', 'superset', 'move_to'] as const).filter((k) => p[k] !== undefined);
    if (what.length) done.push(`${exerciseName(data, e.exerciseId)}: ${what.join(', ')}`);
  }
  for (const a of patch.add ?? []) {
    const e: RoutineExercise = {
      exerciseId: findOrCreateExercise(data, a.name).id,
      restSec: Math.max(0, Math.round(a.restSec ?? data.settings?.defaultRestSec ?? 90)),
      notes: a.notes,
      supersetId: a.superset,
      sets: Array.from({ length: clampSets(a.sets ?? 3) }, () => ({ type: 'normal' as const, reps: a.reps, weight: a.weight, durationSec: a.durationSec })),
    };
    insertAt(r.exercises, e, a.position);
    done.push(`añadido ${exerciseName(data, e.exerciseId)}`);
  }
  if (!r.exercises.length) throw new Error(`La rutina "${r.name}" se quedaría sin ejercicios: para eso usa delete_routine.`);
  if (!done.length) throw new Error('No se ha pedido ningún cambio (name, notes, changes o add).');
  return done;
}

// Rutina completa, legible por una IA (sirve para comprobar el cambio o para volver a crearla).
export function routineView(data: WorkstationData, r: Routine) {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes,
    exercises: r.exercises.map((e, i) => ({
      position: i + 1,
      name: exerciseName(data, e.exerciseId),
      exercise_id: e.exerciseId,
      restSec: e.restSec,
      notes: e.notes,
      superset: e.supersetId,
      sets: e.sets.map((s) => ({ type: s.type, reps: s.reps, weight: s.weight, durationSec: s.durationSec, distanceM: s.distanceM })),
    })),
  };
}
