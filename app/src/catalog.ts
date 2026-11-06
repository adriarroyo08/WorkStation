// Catálogo libre (public/catalog.json): se descarga una vez y se comparte entre pantallas.
import type { Exercise, ExerciseKind, MuscleGroup } from '../../shared/types';
import { catalogExerciseId } from '../../shared/catalog';

export interface CatalogItem {
  id: string;
  name: string;
  muscle: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: string;
  category: string;
  level: string;
  kind: ExerciseKind;
  instructions: string[];
}

let catalogCache: Promise<CatalogItem[]> | null = null;
export const loadCatalog = (): Promise<CatalogItem[]> =>
  (catalogCache ??= fetch('catalog.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`catalog ${r.status}`))))
    .catch((e) => {
      // Sin red la primera vez: que el siguiente intento vuelva a pedirlo.
      catalogCache = null;
      throw e;
    }));

/** Ejercicio de la biblioteca creado a partir de uno del catálogo. */
export const catalogToExercise = (c: CatalogItem): Exercise => ({
  id: catalogExerciseId(c.id),
  name: c.name,
  muscle: c.muscle,
  secondary: c.secondary,
  equipment: c.equipment,
  kind: c.kind,
  media: c.id,
  instructions: c.instructions,
  custom: true,
});
