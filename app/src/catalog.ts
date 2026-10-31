// Catálogo libre (public/catalog.json): se descarga una vez y se comparte entre pantallas.
import type { ExerciseKind, MuscleGroup } from '../../shared/types';

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
