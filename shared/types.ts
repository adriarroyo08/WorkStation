// Modelo de datos compartido entre la app (PWA) y el servidor MCP.
// El fichero de backup JSON (WorkstationData) es el formato de intercambio.

// weight_reps: peso + reps · reps: peso corporal (+kg lastre opcional) · assisted: peso corporal asistido (kg de ayuda)
// duration: tiempo · distance: distancia + tiempo
export type ExerciseKind = 'weight_reps' | 'reps' | 'assisted' | 'duration' | 'distance';

export type MuscleGroup =
  | 'pecho'
  | 'espalda'
  | 'dorsales'
  | 'trapecio'
  | 'lumbar'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'antebrazo'
  | 'cuadriceps'
  | 'isquios'
  | 'gluteos'
  | 'abductores'
  | 'aductores'
  | 'gemelos'
  | 'core'
  | 'cuello'
  | 'cardio'
  | 'cuerpo_completo'
  | 'otro';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  secondary?: MuscleGroup[];
  equipment: string;
  kind: ExerciseKind;
  // Id en el catálogo libre free-exercise-db (imágenes + instrucciones).
  media?: string;
  // Id en ExerciseDB (GIF animado, se carga con la API key del usuario).
  exdbId?: string;
  instructions?: string[];
  // Nota fija que aparece cada vez que haces el ejercicio.
  stickyNote?: string;
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
  restSec?: number;
  // Ejercicios consecutivos con el mismo supersetId forman una superserie.
  supersetId?: string;
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
  // Frecuencia cardiaca (reloj Wear OS o pulsómetro Bluetooth). samples: [segundos desde el inicio, ppm].
  heartRate?: { avg: number; max: number; min: number; samples?: [number, number][] };
}

export interface RoutineExercise {
  exerciseId: string;
  restSec: number;
  notes?: string;
  supersetId?: string;
  sets: { type: SetType; weight?: number; reps?: number; durationSec?: number; distanceM?: number }[];
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  folderId?: string;
  exercises: RoutineExercise[];
}

export interface RoutineFolder {
  id: string;
  name: string;
}

export const MEASUREMENT_FIELDS = ['bodyweight', 'bodyFat', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'leftArm', 'rightArm', 'leftThigh', 'rightThigh', 'leftCalf', 'rightCalf'] as const;
export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

// photos: ids de fotos de progreso guardadas solo en el dispositivo (IndexedDB), no en el JSON.
export type Measurement = { id: string; date: string; notes?: string; photos?: string[] } & Partial<Record<MeasurementField, number>>;

export interface Settings {
  defaultRestSec: number;
  weekStartsMonday: boolean;
  weeklyGoal: number; // entrenos por semana
  keepAwake: boolean;
  sound: boolean;
  vibrate: boolean;
  showRpe: boolean;
  theme: 'auto' | 'dark' | 'light';
  barKg: number;
  platesKg: number[];
  // Para los niveles de fuerza (los estándares difieren entre hombres y mujeres).
  sex?: 'm' | 'f';
  // Unidad de peso visible (los datos siempre se guardan en kg).
  unit?: 'kg' | 'lb';
  // Barra y discos para la calculadora cuando la unidad es lb.
  barLb?: number;
  platesLb?: number[];
}

export const DEFAULT_SETTINGS: Settings = {
  defaultRestSec: 90,
  weekStartsMonday: true,
  weeklyGoal: 3,
  keepAwake: true,
  sound: true,
  vibrate: true,
  showRpe: false,
  theme: 'auto',
  barKg: 20,
  platesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export interface WorkstationData {
  version: 1;
  exportedAt?: string;
  exercises: Exercise[];
  routines: Routine[];
  folders: RoutineFolder[];
  workouts: Workout[];
  measurements: Measurement[];
  settings: Settings;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
