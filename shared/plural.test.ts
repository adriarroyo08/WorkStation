import { expect, it } from 'vitest';
import { plural } from './plural';

it('usa singular solo para uno y admite plurales compuestos', () => {
  expect(plural(0, 'entrenamiento')).toBe('0 entrenamientos');
  expect(plural(1, 'entrenamiento')).toBe('1 entrenamiento');
  expect(plural(2, 'serie')).toBe('2 series');
  expect(plural(1, 'serie')).toBe('1 serie');
  expect(plural(1, 'ejercicio personalizado nuevo', 'ejercicios personalizados nuevos')).toBe('1 ejercicio personalizado nuevo');
  expect(plural(2, 'ejercicio personalizado nuevo', 'ejercicios personalizados nuevos')).toBe('2 ejercicios personalizados nuevos');
  expect(plural(1, 'registro omitido', 'registros omitidos')).toBe('1 registro omitido');
  expect(plural(0, 'registro omitido', 'registros omitidos')).toBe('0 registros omitidos');
});
