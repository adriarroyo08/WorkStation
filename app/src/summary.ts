import { estimate1RM, formatSet } from '../../shared/stats';
import type { Exercise, WorkoutExercise } from '../../shared/types';

// "Mejor serie" de un ejercicio dentro de un entrenamiento (la de mayor 1RM estimado, o la más larga).
export function bestSetText(we: WorkoutExercise, e?: Exercise): string {
  const sets = we.sets.filter((s) => s.done && s.type !== 'warmup');
  if (!sets.length) return '—';
  const score = (s: (typeof sets)[number]) => estimate1RM(s.weight ?? 0, s.reps ?? 0) || (s.reps ?? 0) + (s.durationSec ?? 0) + (s.distanceM ?? 0) / 10;
  const best = sets.reduce((a, b) => (score(b) > score(a) ? b : a));
  return `Mejor serie: ${formatSet(best, e)}`;
}
