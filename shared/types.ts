// Modelo de datos compartido entre la app (PWA) y el servidor MCP.
// El fichero de backup JSON (WorkstationData) es el formato de intercambio.

export type ExerciseKind = 'weight_reps' | 'reps' | 'duration' | 'distance';

export type MuscleGroup =
  | 'pecho'
  | 'espalda'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'antebrazo'
  | 'cuadriceps'
  | 'isquios'
  | 'gluteos'
  | 'gemelos'
  | 'core'
  | 'cardio'
  | 'cuerpo_completo';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: string;
  kind: ExerciseKind;
  custom?: boolean;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  type: SetType;
  weight?: number; // kg
  reps?: number;
  rpe?: number;
  durationSec?: number;
  distanceM?: number;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  notes?: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO
  notes?: string;
  routineId?: string;
  exercises: WorkoutExercise[];
}

export interface RoutineExercise {
  exerciseId: string;
  restSec: number;
  notes?: string;
  sets: { type: SetType; weight?: number; reps?: number; durationSec?: number }[];
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  exercises: RoutineExercise[];
}

export interface Measurement {
  id: string;
  date: string; // ISO
  bodyweight?: number;
  bodyFat?: number;
}

export interface WorkstationData {
  version: 1;
  exportedAt?: string;
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  measurements: Measurement[];
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
