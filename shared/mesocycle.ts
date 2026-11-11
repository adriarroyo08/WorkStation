// Mesociclos: una carpeta de rutinas convertida en programa de 4 a 12 semanas.
// Las rutinas de la carpeta son los días; el programa prescribe, semana a semana, series, reps y carga
// (% del 1RM o RPE objetivo) de los ejercicios principales. El resto sigue con la progresión doble.
// Diseño y límites: docs/mesociclos.md.
import { workoutFromRoutine } from './data';
import { weightStep } from './progression';
import { exerciseHistory } from './stats';
import { fromUnit, toUnit, weightUnit, type WeightUnit } from './units';
import type { Exercise, Routine, RoutineFolder, Workout, WorkoutSet, WorkstationData } from './types';

export type MesoPhase = 'acumulacion' | 'intensificacion' | 'descarga';

export const PHASE_LABELS: Record<MesoPhase, string> = { acumulacion: 'Acumulación', intensificacion: 'Intensificación', descarga: 'Descarga' };

/** Prescripción de un ejercicio principal en una semana. pct = % del 1RM (0-100); rpe = esfuerzo objetivo. */
export interface MesoTarget {
  sets: number;
  reps: number;
  repsMin?: number;
  pct?: number;
  rpe?: number;
}

export interface MesoWeek {
  phase: MesoPhase;
  main: MesoTarget;
  /** Fracción de series que conservan los ejercicios no principales (descarga: 0,5). Por defecto 1. */
  accessorySets?: number;
}

export interface Mesocycle {
  /** ISO. Cuentan las sesiones de la carpeta empezadas desde este momento. */
  startedAt: string;
  weeks: MesoWeek[];
  /** Ejercicios principales (los que siguen la prescripción). */
  lifts: string[];
  /** 1RM escrito a mano (kg); manda sobre el estimado. */
  oneRm?: Record<string, number>;
  /** Prescripción propia de un ejercicio en una semana (índice = semana), sobre la general. */
  overrides?: Record<string, (Partial<MesoTarget> | null)[]>;
  template?: string;
  endedAt?: string;
}

/** Marca que lleva un entreno empezado desde un programa. */
export interface WorkoutProgram {
  folderId: string;
  week: number;
  phase: MesoPhase;
  lifts: string[];
}

export const MIN_WEEKS = 4;
export const MAX_WEEKS = 12;

export interface MesoTemplate {
  id: string;
  name: string;
  description: string;
  weeks: MesoWeek[];
}

const w = (phase: MesoPhase, sets: number, reps: number, load: { pct?: number; rpe?: number }, accessorySets?: number): MesoWeek => ({
  phase,
  main: { sets, reps, ...load },
  ...(accessorySets !== undefined ? { accessorySets } : {}),
});

// Descarga según docs/investigacion-descarga.md (Bell 2023/2025): la mitad de series, carga parecida y lejos del fallo.
export const MESO_TEMPLATES: MesoTemplate[] = [
  {
    id: 'fuerza-4',
    name: 'Bloque de fuerza · 4 semanas',
    description: 'Tres semanas subiendo carga por % de 1RM y una de descarga.',
    weeks: [w('acumulacion', 4, 8, { pct: 70 }), w('acumulacion', 4, 6, { pct: 75 }), w('intensificacion', 4, 4, { pct: 82.5 }), w('descarga', 2, 4, { pct: 75 }, 0.5)],
  },
  {
    id: 'fuerza-8',
    name: 'Fuerza · 8 semanas',
    description: 'Dos olas de acumulación e intensificación con descarga al final de cada una.',
    weeks: [
      w('acumulacion', 4, 8, { pct: 67.5 }),
      w('acumulacion', 4, 7, { pct: 72.5 }),
      w('intensificacion', 4, 5, { pct: 80 }),
      w('descarga', 2, 5, { pct: 72.5 }, 0.5),
      w('acumulacion', 4, 6, { pct: 75 }),
      w('intensificacion', 4, 4, { pct: 82.5 }),
      w('intensificacion', 3, 3, { pct: 87.5 }),
      w('descarga', 2, 3, { pct: 77.5 }, 0.5),
    ],
  },
  {
    id: 'hipertrofia-6',
    name: 'Hipertrofia por RPE · 6 semanas',
    description: 'Mismo rango de reps, más cerca del fallo cada semana; la sexta, descarga.',
    weeks: [
      w('acumulacion', 3, 10, { rpe: 7 }),
      w('acumulacion', 4, 10, { rpe: 7.5 }),
      w('acumulacion', 4, 10, { rpe: 8 }),
      w('intensificacion', 4, 8, { rpe: 8.5 }),
      w('intensificacion', 4, 8, { rpe: 9 }),
      w('descarga', 2, 8, { rpe: 6 }, 0.5),
    ],
  },
];

/** Error de validación de un mesociclo, o undefined si es válido. */
export function mesocycleError(m: Mesocycle): string | undefined {
  if (m.weeks.length < MIN_WEEKS || m.weeks.length > MAX_WEEKS) return `Un programa dura de ${MIN_WEEKS} a ${MAX_WEEKS} semanas.`;
  if (!m.lifts.length) return 'Elige al menos un ejercicio principal.';
  for (const [i, wk] of m.weeks.entries()) {
    const t = wk.main;
    if (!(t.sets >= 1 && t.sets <= 10) || !(t.reps >= 1 && t.reps <= 30)) return `Semana ${i + 1}: series de 1 a 10 y reps de 1 a 30.`;
    if (t.pct !== undefined && !(t.pct >= 30 && t.pct <= 100)) return `Semana ${i + 1}: el % de 1RM va de 30 a 100.`;
    if (t.rpe !== undefined && !(t.rpe >= 5 && t.rpe <= 10)) return `Semana ${i + 1}: el RPE va de 5 a 10.`;
    if (t.pct === undefined && t.rpe === undefined) return `Semana ${i + 1}: indica % de 1RM o RPE.`;
  }
  return undefined;
}

/** Crea un mesociclo desde una plantilla: por defecto, el primer ejercicio con peso de cada rutina es principal. */
export function mesocycleFromTemplate(templateId: string, routines: Routine[], exercises: Exercise[], now = new Date().toISOString()): Mesocycle {
  const t = MESO_TEMPLATES.find((x) => x.id === templateId) ?? MESO_TEMPLATES[0];
  const kind = new Map(exercises.map((e) => [e.id, e.kind]));
  const lifts = [...new Set(routines.flatMap((r) => r.exercises.find((e) => kind.get(e.exerciseId) === 'weight_reps')?.exerciseId ?? []))];
  return { startedAt: now, weeks: structuredClone(t.weeks), lifts, template: t.id };
}

export const programRoutines = (data: WorkstationData, folderId: string) => data.routines.filter((r) => r.folderId === folderId && r.exercises.length);

export interface MesoProgress {
  /** Semana actual (0-based); igual a weeks.length cuando el programa ha terminado. */
  week: number;
  done: number;
  total: number;
  perWeek: number;
  finished: boolean;
}

/**
 * Progreso por sesiones hechas, no por calendario: saltarse un día no salta la semana.
 * Una semana = una vuelta a las rutinas de la carpeta.
 */
export function mesoProgress(data: WorkstationData, folder: RoutineFolder & { mesocycle: Mesocycle }): MesoProgress {
  const ids = new Set(programRoutines(data, folder.id).map((r) => r.id));
  const perWeek = Math.max(1, ids.size);
  const m = folder.mesocycle;
  const done = data.workouts.filter((x) => x.endedAt && x.routineId && ids.has(x.routineId) && x.startedAt >= m.startedAt).length;
  const total = perWeek * m.weeks.length;
  const week = Math.min(m.weeks.length, Math.floor(done / perWeek));
  return { week, done: Math.min(done, total), total, perWeek, finished: done >= total };
}

export const activeProgram = (f: RoutineFolder): f is RoutineFolder & { mesocycle: Mesocycle } => !!f.mesocycle && !f.mesocycle.endedAt;

/** Programa activo al que pertenece una rutina, si lo hay. */
export function programForRoutine(data: WorkstationData, routine: Routine): (RoutineFolder & { mesocycle: Mesocycle }) | undefined {
  const f = routine.folderId ? data.folders.find((x) => x.id === routine.folderId) : undefined;
  return f && activeProgram(f) ? f : undefined;
}

/** Prescripción de un ejercicio principal en una semana, con su ajuste propio si lo tiene. */
export function targetFor(m: Mesocycle, week: number, exerciseId: string): MesoTarget {
  const base = m.weeks[Math.min(week, m.weeks.length - 1)].main;
  const own = m.overrides?.[exerciseId]?.[week];
  return { ...base, ...(own ?? {}) };
}

const WINDOW_DAYS = 120;

/**
 * 1RM vigente al empezar el programa (kg): el escrito a mano o el mejor estimado (Epley) de los 120 días anteriores.
 * Se congela al inicio para que los pesos de una semana no cambien a mitad del bloque. undefined = no hay datos.
 */
export function programOneRm(data: WorkstationData, m: Mesocycle, exerciseId: string): { kg: number; source: 'manual' | 'estimado' } | undefined {
  const manual = m.oneRm?.[exerciseId];
  if (manual && manual > 0) return { kg: manual, source: 'manual' };
  const from = new Date(Date.parse(m.startedAt) - WINDOW_DAYS * 86400_000).toISOString();
  const best = Math.max(0, ...exerciseHistory(data, exerciseId).filter((s) => s.date < m.startedAt && s.date >= from).map((s) => s.best1RM));
  return best > 0 ? { kg: best, source: 'estimado' } : undefined;
}

/** Peso de trabajo (kg) = 1RM × %, redondeado hacia abajo al incremento del ejercicio en la unidad visible. */
export function prescribedWeight(oneRmKg: number, pct: number, ex?: Exercise, u: WeightUnit = weightUnit()): number {
  const step = weightStep(ex, u);
  const raw = toUnit((oneRmKg * pct) / 100, u);
  const loaded = Math.floor(raw / step + 1e-9) * step;
  return u === 'kg' ? Math.round(loaded * 100) / 100 : fromUnit(loaded, u);
}

export interface LiftPlan {
  exerciseId: string;
  target: MesoTarget;
  /** kg calculados; undefined si la semana va por RPE o falta el 1RM. */
  weight?: number;
  oneRm?: { kg: number; source: 'manual' | 'estimado' };
  /** Falta el 1RM para una semana por %. */
  missingOneRm: boolean;
}

export function liftPlan(data: WorkstationData, m: Mesocycle, week: number, exerciseId: string): LiftPlan {
  const target = targetFor(m, week, exerciseId);
  const oneRm = programOneRm(data, m, exerciseId);
  const ex = data.exercises.find((e) => e.id === exerciseId);
  const weight = target.pct !== undefined && oneRm ? prescribedWeight(oneRm.kg, target.pct, ex) : undefined;
  return { exerciseId, target, weight, oneRm, missingOneRm: target.pct !== undefined && !oneRm };
}

/**
 * Sesión de una rutina del programa: los principales llevan las series, reps y peso de la semana;
 * los demás conservan la rutina, con menos series en descarga. Los calentamientos se mantienen.
 */
export function workoutFromProgram(data: WorkstationData, routine: Routine, folder: RoutineFolder & { mesocycle: Mesocycle }): Workout {
  const base = workoutFromRoutine(routine);
  const m = folder.mesocycle;
  const { week, finished } = mesoProgress(data, folder);
  if (finished) return base;
  const wk = m.weeks[week];
  const lifts = new Set(m.lifts);
  base.program = { folderId: folder.id, week, phase: wk.phase, lifts: m.lifts.filter((id) => routine.exercises.some((e) => e.exerciseId === id)) };
  for (const we of base.exercises) {
    const warmups = we.sets.filter((s) => s.type === 'warmup');
    const work = we.sets.filter((s) => s.type !== 'warmup');
    if (lifts.has(we.exerciseId)) {
      const plan = liftPlan(data, m, week, we.exerciseId);
      const t = plan.target;
      const fallback = work.find((s) => s.weight !== undefined)?.weight;
      const set: WorkoutSet = { type: 'normal', reps: t.reps, ...(t.repsMin !== undefined ? { repsMin: t.repsMin } : {}), weight: plan.weight ?? fallback, done: false };
      we.sets = [...warmups, ...Array.from({ length: t.sets }, () => ({ ...set }))];
      const goal = t.pct !== undefined ? `${t.pct}% 1RM` : `RPE ${t.rpe}`;
      we.notes = [`Programa: ${t.sets}×${t.repsMin !== undefined ? `${t.repsMin}-` : ''}${t.reps} · ${goal}${plan.missingOneRm ? ' (sin 1RM: elige el peso)' : ''}`, we.notes].filter(Boolean).join('\n');
    } else if (wk.accessorySets !== undefined && wk.accessorySets < 1 && work.length) {
      const keep = Math.max(1, Math.round(work.length * wk.accessorySets));
      we.sets = [...warmups, ...work.slice(0, keep)];
    }
  }
  return base;
}

/** Entreno para una rutina: con la prescripción del programa si pertenece a uno activo. */
export function workoutForRoutine(data: WorkstationData, routine: Routine): Workout {
  const folder = programForRoutine(data, routine);
  return folder ? workoutFromProgram(data, routine, folder) : workoutFromRoutine(routine);
}

/** Normaliza un mesociclo cargado (backup, sync): descarta lo que no encaja sin romper la carpeta. */
export function normalizeMesocycle(v: unknown): Mesocycle | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const m = v as Partial<Mesocycle>;
  if (typeof m.startedAt !== 'string' || !Array.isArray(m.weeks) || !Array.isArray(m.lifts)) return undefined;
  const phases: MesoPhase[] = ['acumulacion', 'intensificacion', 'descarga'];
  const weeks = m.weeks.filter((x): x is MesoWeek => !!x && phases.includes(x.phase) && !!x.main && typeof x.main.sets === 'number' && typeof x.main.reps === 'number');
  if (!weeks.length) return undefined;
  return { ...m, startedAt: m.startedAt, weeks, lifts: m.lifts.filter((x): x is string => typeof x === 'string') } as Mesocycle;
}
