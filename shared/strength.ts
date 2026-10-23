// Niveles de fuerza orientativos: 1RM estimado frente al peso corporal (o reps en dominadas/fondos).
// Umbrales aproximados a partir de tablas públicas de estándares de fuerza para adultos que entrenan.
import { personalRecords } from './stats';
import type { WorkstationData } from './types';

export const LEVELS = ['Principiante', 'Novato', 'Intermedio', 'Avanzado', 'Élite'] as const;
export type Level = (typeof LEVELS)[number];

type Std = { by: 'ratio' | 'reps'; m: number[]; f: number[] };
export const STANDARDS: Record<string, Std> = {
  sentadilla: { by: 'ratio', m: [0.75, 1.25, 1.5, 2.25, 2.75], f: [0.5, 0.75, 1.0, 1.5, 1.9] },
  'press-banca': { by: 'ratio', m: [0.5, 0.75, 1.0, 1.5, 2.0], f: [0.25, 0.5, 0.75, 1.0, 1.3] },
  'peso-muerto': { by: 'ratio', m: [1.0, 1.5, 2.0, 2.5, 3.0], f: [0.5, 1.0, 1.25, 1.75, 2.25] },
  'press-militar': { by: 'ratio', m: [0.35, 0.55, 0.75, 1.0, 1.25], f: [0.2, 0.35, 0.5, 0.7, 0.9] },
  'remo-barra': { by: 'ratio', m: [0.5, 0.75, 1.0, 1.5, 1.75], f: [0.3, 0.45, 0.65, 0.9, 1.15] },
  'hip-thrust': { by: 'ratio', m: [0.75, 1.25, 1.75, 2.5, 3.0], f: [0.5, 1.0, 1.5, 2.0, 2.5] },
  dominadas: { by: 'reps', m: [1, 5, 10, 15, 22], f: [1, 2, 5, 9, 14] },
  fondos: { by: 'reps', m: [3, 8, 15, 25, 35], f: [1, 3, 8, 14, 22] },
};

export interface StrengthLevel {
  exerciseId: string;
  exerciseName: string;
  value: number; // kg de 1RM o reps
  unit: 'kg' | 'reps';
  ratio?: number; // 1RM / peso corporal
  level: number; // -1 = por debajo de Principiante, 0..4 = índice en LEVELS
  next?: { level: Level; target: number; missing: number };
  // 0..1 dentro del tramo actual (para la barra de progreso)
  progress: number;
}

export const latestBodyweight = (data: WorkstationData): number | undefined => [...data.measurements].sort((a, b) => b.date.localeCompare(a.date)).find((m) => m.bodyweight)?.bodyweight;

export function strengthLevel(exerciseId: string, value: number, bodyweight: number | undefined, sex: 'm' | 'f' = 'm', name = exerciseId): StrengthLevel | null {
  const std = STANDARDS[exerciseId];
  if (!std || value <= 0) return null;
  if (std.by === 'ratio' && !bodyweight) return null;
  const targets = std[sex].map((t) => (std.by === 'ratio' ? Math.round(t * bodyweight! * 2) / 2 : t));
  let level = -1;
  targets.forEach((t, i) => value >= t && (level = i));
  const lo = level < 0 ? 0 : targets[level];
  const hi = targets[level + 1];
  return {
    exerciseId,
    exerciseName: name,
    value,
    unit: std.by === 'ratio' ? 'kg' : 'reps',
    ratio: std.by === 'ratio' ? Math.round((value / bodyweight!) * 100) / 100 : undefined,
    level,
    next: hi === undefined ? undefined : { level: LEVELS[level + 1], target: hi, missing: Math.round((hi - value) * 10) / 10 },
    progress: hi === undefined ? 1 : Math.max(0, Math.min(1, (value - lo) / (hi - lo))),
  };
}

/** Niveles de los ejercicios con estándar que el usuario ha entrenado. */
export function strengthLevels(data: WorkstationData): StrengthLevel[] {
  const bw = latestBodyweight(data);
  const sex = data.settings.sex ?? 'm';
  return personalRecords(data)
    .map((pr) => strengthLevel(pr.exerciseId, STANDARDS[pr.exerciseId]?.by === 'reps' ? pr.maxReps : pr.best1RM, bw, sex, pr.exerciseName))
    .filter((l): l is StrengthLevel => !!l);
}
