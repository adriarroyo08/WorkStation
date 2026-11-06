import { expect, it } from 'vitest';
import { MOVEMENT_PATTERN_LABELS } from './exercises';
import { MOVEMENT_PATTERNS } from './types';

it('etiqueta todos los patrones en español con sus tildes', () => {
  expect(Object.keys(MOVEMENT_PATTERN_LABELS).sort()).toEqual([...MOVEMENT_PATTERNS].sort());
  expect(MOVEMENT_PATTERNS.map((pattern) => MOVEMENT_PATTERN_LABELS[pattern])).toEqual([
    'Sentadilla',
    'Bisagra de cadera',
    'Empuje horizontal',
    'Empuje vertical',
    'Tracción horizontal',
    'Tracción vertical',
    'Zancada',
    'Acarreo',
    'Rotación',
    'Antirrotación',
    'Aislamiento',
  ]);
});
