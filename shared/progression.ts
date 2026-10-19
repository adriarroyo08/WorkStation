// Sugerencia de sobrecarga progresiva a partir de la última sesión del ejercicio.
import { MUSCLE_REGION } from './exercises';
import type { Exercise, WorkoutSet } from './types';

export interface Suggestion {
  weight?: number;
  reps?: number;
  durationSec?: number;
  action: 'up' | 'repeat' | 'reps' | 'time';
  reason: string;
}

// Incremento habitual según material y zona: barra de pierna 5 kg, mancuernas 2 kg, resto 2,5 kg.
export function weightStep(ex?: Exercise): number {
  if (!ex) return 2.5;
  if (ex.equipment === 'mancuernas') return 2;
  if (ex.equipment === 'barra' && MUSCLE_REGION[ex.muscle] === 'Piernas') return 5;
  if (ex.muscle === 'lumbar' && ex.equipment === 'barra') return 5;
  return 2.5;
}

/**
 * prev: series de la última sesión. targetReps: reps objetivo (de la rutina) si las hay.
 * Regla: si en el peso más alto hiciste todas las reps objetivo y el esfuerzo no fue máximo (RPE ≤ 8,5),
 * sube peso; si te quedaste corto, repite el peso buscando las reps.
 */
export function suggestNext(prev: WorkoutSet[], ex?: Exercise, targetReps?: number): Suggestion | null {
  const work = prev.filter((s) => s.done && s.type !== 'warmup');
  if (!work.length) return null;
  const kind = ex?.kind ?? 'weight_reps';

  if (kind === 'duration') {
    const best = Math.max(...work.map((s) => s.durationSec ?? 0));
    return best ? { durationSec: best + 5, action: 'time', reason: `La última vez aguantaste ${best}s: intenta 5s más.` } : null;
  }
  if (kind === 'reps' || kind === 'assisted') {
    const best = Math.max(...work.map((s) => s.reps ?? 0));
    if (!best) return null;
    const allMax = work.every((s) => (s.reps ?? 0) >= best);
    return {
      reps: best + 1,
      weight: work.find((s) => (s.reps ?? 0) === best)?.weight,
      action: 'reps',
      reason: allMax ? 'Todas las series al máximo: suma una repetición.' : `Mejor serie: ${best} reps. Busca ${best + 1}.`,
    };
  }
  if (kind === 'distance') return null;

  const top = Math.max(...work.map((s) => s.weight ?? 0));
  if (!top) return null;
  const atTop = work.filter((s) => (s.weight ?? 0) === top);
  const goal = targetReps ?? Math.max(...atTop.map((s) => s.reps ?? 0));
  const hitAll = atTop.every((s) => (s.reps ?? 0) >= goal);
  const rpes = atTop.map((s) => s.rpe).filter((r): r is number => r !== undefined);
  const hard = rpes.length > 0 && rpes.reduce((a, b) => a + b, 0) / rpes.length > 8.5;
  const step = weightStep(ex);
  // Siguiente peso cargable: múltiplo del incremento por encima del actual (47 → 50, 80 → 82,5).
  const next = Math.ceil((top + step / 2) / step) * step;
  if (hitAll && !hard)
    return { weight: Math.round(next * 100) / 100, reps: goal, action: 'up', reason: `Completaste ${atTop.length}×${goal} con ${top} kg: sube a ${Math.round(next * 100) / 100} kg.` };
  if (hitAll && hard) return { weight: top, reps: goal + 1, action: 'reps', reason: `Muy exigente (RPE alto): mantén ${top} kg y busca una rep más.` };
  return { weight: top, reps: goal, action: 'repeat', reason: `Te faltaron reps con ${top} kg: repite el peso hasta completar ${goal}.` };
}
