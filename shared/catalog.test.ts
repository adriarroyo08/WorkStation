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

describe('búsqueda en español o en inglés', async () => {
  const { matchesExercise } = await import('./exercises');
  const curl = { name: 'Curl con barra Z', media: 'EZ-Bar_Curl' };
  it('encuentra por el nombre en español sin tildes ni mayúsculas', () => {
    expect(matchesExercise({ name: 'Elevación de gemelos', media: undefined }, 'elevacion GEMELOS')).toBe(true);
  });
  it('encuentra por el nombre original en inglés', () => {
    expect(matchesExercise(curl, 'ez bar curl')).toBe(true);
    expect(matchesExercise(curl, 'curl ez')).toBe(true);
    expect(matchesExercise({ name: 'Press de banca (barra)', media: 'Barbell_Bench_Press_-_Medium_Grip' }, 'bench press')).toBe(true);
  });
  it('no inventa coincidencias', () => {
    expect(matchesExercise(curl, 'squat')).toBe(false);
    expect(matchesExercise({ name: 'X', media: 'https://wger.de/a.png' }, 'wger')).toBe(false);
  });
});
