import { estimate1RM, exerciseHistory } from './stats';
import type { ExerciseKind, WorkoutSet, WorkstationData } from './types';

/** Peso vigente en la sesión; antes de la primera medida usa la primera disponible. */
export function bodyweightAt(data: WorkstationData, isoDate: string): number | undefined {
  const measurements = data.measurements.filter((m) => Number.isFinite(m.bodyweight) && m.bodyweight! > 0).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return (measurements.filter((m) => Date.parse(m.date) <= Date.parse(isoDate)).at(-1) ?? measurements[0])?.bodyweight;
}

export function effectiveLoadKg(set: WorkoutSet, kind: ExerciseKind, bw: number | undefined): number | undefined {
  if (bw === undefined) return undefined;
  if (kind === 'reps') return bw + (set.weight ?? 0);
  if (kind === 'assisted') return Math.max(0, bw - (set.weight ?? 0));
  return undefined;
}

/** Información añadida por sesión, sin modificar el historial ni sus récords. */
export function bodyweightHistory(data: WorkstationData, exerciseId: string) {
  const kind = data.exercises.find((e) => e.id === exerciseId)?.kind;
  if (kind !== 'reps' && kind !== 'assisted') return [];
  return exerciseHistory(data, exerciseId).flatMap((s) => {
    const bw = bodyweightAt(data, s.date);
    if (bw === undefined) return [];
    const loads = s.sets.map((set) => effectiveLoadKg(set, kind, bw)!);
    return [{ ...s, bodyweight: bw, totalLoad: Math.max(...loads), bodyweight1RM: Math.max(...s.sets.map((set, i) => estimate1RM(loads[i], set.reps ?? 0))) }];
  });
}

/** Mejor 1RM estimado del ejercicio sobre su carga efectiva. */
export function bodyweightE1RM(data: WorkstationData, exerciseId: string): number | undefined {
  const history = bodyweightHistory(data, exerciseId);
  return history.length ? Math.max(...history.map((s) => s.bodyweight1RM)) : undefined;
}
