import { matchesExercise } from './exercises';
import { EXERCISE_EVIDENCE_MATRIX, resolveCatalogExerciseScience } from './exercise-evidence';
import type { Exercise, MovementPattern, MuscleGroup } from './types';

/** Solo metadatos explícitos: nunca el patrón o las intensidades del fallback. */
export function availableExerciseScience(exercise: Exercise) {
  if (!exercise.science && (exercise.custom || !EXERCISE_EVIDENCE_MATRIX[exercise.id])) return undefined;
  return resolveCatalogExerciseScience(exercise);
}

export function filterExercises(exercises: Exercise[], filters: { q?: string; muscle?: MuscleGroup | ''; equipment?: string; pattern?: MovementPattern | '' }) {
  return exercises.filter(
    (exercise) =>
      (!filters.muscle || exercise.muscle === filters.muscle || exercise.secondary?.includes(filters.muscle)) &&
      (!filters.equipment || exercise.equipment === filters.equipment) &&
      (!filters.pattern || availableExerciseScience(exercise)?.patron === filters.pattern) &&
      matchesExercise(exercise, filters.q ?? ''),
  );
}
