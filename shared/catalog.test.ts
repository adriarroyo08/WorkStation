import { describe, expect, it } from 'vitest';
import { catalogExtras, catalogExerciseId } from './catalog';
import { DEFAULT_EXERCISES } from './exercises';
import type { Exercise } from './types';

describe('catalogExtras', () => {
  const items = [{ id: 'Barbell_Curl' }, { id: 'Zottman_Curl' }, { id: 'Drag_Curl' }];
  it('quita los que ya están en la biblioteca por sus imágenes', () => {
    expect(catalogExtras(DEFAULT_EXERCISES, items).map((c) => c.id)).toEqual(['Zottman_Curl', 'Drag_Curl']);
  });
  it('quita los ya añadidos desde el catálogo', () => {
    const lib: Exercise[] = [{ id: catalogExerciseId('Drag_Curl'), name: 'Curl drag', muscle: 'biceps', equipment: 'barra', kind: 'weight_reps', custom: true }];
    expect(catalogExtras(lib, items).map((c) => c.id)).toEqual(['Barbell_Curl', 'Zottman_Curl']);
  });
});
