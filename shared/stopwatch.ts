// Cronómetro de una serie por tiempo. Guarda instantes absolutos y no un contador,
// así el tiempo es correcto aunque se bloquee la pantalla, se suspenda la pestaña o se recargue la app.
import type { Routine, Workout } from './types';

export interface SetStopwatch {
  workoutId: string;
  exerciseId: string;
  ei: number;
  si: number;
  // Instante del último arranque; null si está en pausa.
  startedAt: number | null;
  accumulatedMs: number;
  targetSec?: number;
  targetNotified?: boolean;
}

export function startStopwatch(ref: Pick<SetStopwatch, 'workoutId' | 'exerciseId' | 'ei' | 'si'>, now: number, targetSec?: number): SetStopwatch {
  return { ...ref, startedAt: now, accumulatedMs: 0, ...(targetSec ? { targetSec } : {}) };
}

export function pauseStopwatch(sw: SetStopwatch, now: number): SetStopwatch {
  if (sw.startedAt === null) return sw;
  return { ...sw, startedAt: null, accumulatedMs: sw.accumulatedMs + Math.max(0, now - sw.startedAt) };
}

export function resumeStopwatch(sw: SetStopwatch, now: number): SetStopwatch {
  return sw.startedAt === null ? { ...sw, startedAt: now } : sw;
}

// Segundos completos, los mismos que ve el usuario en pantalla.
export function stopwatchElapsedSec(sw: SetStopwatch, now: number): number {
  const running = sw.startedAt === null ? 0 : Math.max(0, now - sw.startedAt);
  return Math.floor((sw.accumulatedMs + running) / 1000);
}

// True solo la primera vez que se llega al objetivo: el aviso no se repite tras recargar.
export function shouldNotifyTarget(sw: SetStopwatch, now: number): boolean {
  return !!sw.targetSec && !sw.targetNotified && stopwatchElapsedSec(sw, now) >= sw.targetSec;
}

// El cronómetro solo vale para su serie: si esa serie ya no está o ya se completó, se descarta.
export function stopwatchMatches(sw: SetStopwatch, w: Workout): boolean {
  const we = w.exercises[sw.ei];
  const set = we?.sets[sw.si];
  return sw.workoutId === w.id && we?.exerciseId === sw.exerciseId && !!set && !set.done;
}

// Lee lo guardado en el dispositivo; cualquier valor con otra forma se ignora.
export function parseStopwatch(raw: unknown): SetStopwatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<SetStopwatch>;
  const valid =
    typeof s.workoutId === 'string' &&
    typeof s.exerciseId === 'string' &&
    Number.isInteger(s.ei) &&
    Number.isInteger(s.si) &&
    (s.startedAt === null || typeof s.startedAt === 'number') &&
    typeof s.accumulatedMs === 'number';
  return valid ? (s as SetStopwatch) : null;
}

// Duración planificada en la rutina para esa serie (primero en su posición; si se reordenó, por ejercicio).
export function plannedDurationSec(routine: Routine | undefined, ei: number, exerciseId: string, si: number): number | undefined {
  if (!routine) return undefined;
  const planned = routine.exercises[ei]?.exerciseId === exerciseId ? routine.exercises[ei] : routine.exercises.find((e) => e.exerciseId === exerciseId);
  return planned?.sets[si]?.durationSec;
}

// El valor de la serie puede ser una sugerencia ya aplicada (más exigente que la rutina) o un tiempo guardado antes.
export function stopwatchTarget(planned: number | undefined, current: number | undefined): number | undefined {
  const target = Math.max(planned ?? 0, current ?? 0);
  return target > 0 ? target : undefined;
}
