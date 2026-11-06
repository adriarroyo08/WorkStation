import { describe, expect, it } from 'vitest';
import { availableExerciseScience, filterExercises } from './exercise-filter';
import { DEFAULT_EXERCISES } from './exercises';
import type { Exercise } from './types';

const sourced = DEFAULT_EXERCISES.find((e) => e.id === 'press-banca')!;
const unknown: Exercise = { id: 'unknown', name: 'Sin datos', muscle: 'pecho', equipment: 'barra', kind: 'reps', custom: true };
const estimated: Exercise = {
  ...unknown,
  id: 'estimated',
  name: 'Press estimado',
  secondary: ['triceps'],
  science: { patron: 'empuje-horizontal', evidencia: 'estimada', fuentes: [], musculos: [{ id: 'pecho', rol: 'principal', intensidad: 70 }] },
};

describe('filtro de ejercicios', () => {
  it('combina los cuatro filtros y admite musculos secundarios', () => {
    const exercises = [sourced, estimated, unknown];
    expect(filterExercises(exercises, { q: 'estimado press', muscle: 'triceps', equipment: 'barra', pattern: 'empuje-horizontal' })).toEqual([estimated]);
    for (const filters of [{ q: 'ausente' }, { muscle: 'core' as const }, { equipment: 'polea' }, { pattern: 'bisagra' as const }]) {
      expect(filterExercises(exercises, { q: 'press', pattern: 'empuje-horizontal', ...filters })).toEqual([]);
    }
    expect(filterExercises(exercises, { q: '', muscle: '', equipment: '', pattern: '' })).toEqual(exercises);
  });
  it('no inventa metadatos para catalogo ni personalizados aunque compartan id', () => {
    expect(availableExerciseScience(unknown)).toBeUndefined();
    expect(availableExerciseScience({ ...unknown, custom: false })).toBeUndefined();
    expect(availableExerciseScience({ ...sourced, science: undefined, custom: true })).toBeUndefined();
    expect(filterExercises([unknown], { pattern: 'aislamiento' })).toEqual([]);
    expect(filterExercises([unknown], { q: 'sin datos' })).toEqual([unknown]);
  });
  it('resuelve datos existentes y conserva estimaciones sin citas', () => {
    expect(availableExerciseScience({ ...sourced, science: undefined })?.fuentes.length).toBeGreaterThan(0);
    expect(availableExerciseScience(estimated)).toEqual(estimated.science);
  });
});

it('conserva las fuentes sin enlace como texto sin impedir consultar los metadatos', () => {
  const science = { ...availableExerciseScience(sourced)!, fuentes: [{ titulo: 'Referencia sin enlace', autores: ['Autor'], año: 2024 }] };
  expect(availableExerciseScience({ ...sourced, science })).toEqual(science);
});
