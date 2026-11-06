import { describe, expect, it } from 'vitest';
import { EFFORT_OPTIONS, effortFromRpe, effortToRpe } from './effort';

describe('escala de esfuerzo', () => {
  it('convierte todos los valores exactos y medios puntos sin pérdida', () => {
    for (const rpe of EFFORT_OPTIONS.rpe) {
      expect(effortFromRpe(rpe, 'rpe')).toBe(rpe);
      expect(effortToRpe(rpe, 'rpe')).toBe(rpe);
      expect(effortFromRpe(rpe, 'rir')).toBe(10 - rpe);
      expect(effortToRpe(effortFromRpe(rpe, 'rir'), 'rir')).toBe(rpe);
    }
    expect(effortToRpe(2, 'rir')).toBe(8);
    expect(effortFromRpe(6, 'rir')).toBe(4);
    expect(effortFromRpe(10, 'rir')).toBe(0);
  });

  it('conserva esfuerzo vacío en ambas escalas', () => {
    for (const scale of ['rpe', 'rir'] as const) {
      expect(effortToRpe(undefined, scale)).toBeUndefined();
      expect(effortFromRpe(undefined, scale)).toBeUndefined();
    }
  });

  it('rechaza valores fuera de límites, no finitos o pasos distintos de medio punto', () => {
    for (const value of [-1, 4.5, 5, 10, NaN, Infinity, 1.25]) expect(effortToRpe(value, 'rir')).toBeUndefined();
    for (const value of [0, 5.5, 10.5, NaN, Infinity, 8.25]) {
      expect(effortToRpe(value, 'rpe')).toBeUndefined();
      expect(effortFromRpe(value, 'rir')).toBeUndefined();
    }
  });
});
