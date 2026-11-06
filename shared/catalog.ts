// Ejercicios del catálogo libre que todavía no están en la biblioteca del usuario.
import type { Exercise } from './types';

/** Id que recibe en la biblioteca un ejercicio añadido desde el catálogo. */
export const catalogExerciseId = (catalogId: string) => `db-${catalogId}`;

/** Quita del catálogo los que ya están en la biblioteca (por id o porque un ejercicio propio usa sus imágenes). */
export function catalogExtras<T extends { id: string }>(library: Exercise[], items: T[]): T[] {
  const ids = new Set(library.map((e) => e.id));
  const media = new Set(library.map((e) => e.media).filter(Boolean));
  return items.filter((c) => !media.has(c.id) && !ids.has(catalogExerciseId(c.id)));
}
