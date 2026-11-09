import { workoutDurationMin, workoutSetCount, workoutVolume } from './stats';
import type { Exercise, Workout } from './types';
import { fmtMass } from './units';

// Reutilizar Intl evita crear tres formateadores por fila y por ampliación.
const weekdayFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const monthYearFormat = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const shortDatePart = (value: string) => value.replace(/[.,]/g, '').trim().toUpperCase();

export function historyDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const year = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${shortDatePart(weekdayFormat.format(date))} ${date.getDate()} ${shortDatePart(monthFormat.format(date))}${year}`;
}

export const historyMonth = (iso: string) => monthYearFormat.format(new Date(iso));

export function historyRowSummary(w: Workout, exercises: Exercise[], now = new Date()) {
  const date = historyDate(w.startedAt, now);
  const volume = fmtMass(workoutVolume(w, exercises));
  const duration = workoutDurationMin(w);
  const sets = workoutSetCount(w);
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const lines = w.exercises.slice(0, 4).map((e) => `${e.sets.length} × ${names.get(e.exerciseId) ?? e.exerciseId}`);
  const extra = w.exercises.length > 4 ? `+ ${w.exercises.length - 4} más` : '';
  return { date, volume, duration, sets, lines, extra };
}
