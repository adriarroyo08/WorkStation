import { describe, expect, it } from 'vitest';
import { dragShift, dropIndex } from './reorder';
import { SET_LABEL, SET_NAMES, SET_TYPES } from './set-types';

describe('dropIndex', () => {
  it('elige la fila más cercana al dedo', () => {
    expect(dropIndex(100, 100, 60, 5)).toBe(0);
    expect(dropIndex(155, 100, 60, 5)).toBe(1);
    expect(dropIndex(225, 100, 60, 5)).toBe(2);
  });
  it('se queda dentro de la lista', () => {
    expect(dropIndex(-500, 100, 60, 5)).toBe(0);
    expect(dropIndex(5000, 100, 60, 5)).toBe(4);
    expect(dropIndex(300, 100, 0, 5)).toBe(0);
    expect(dropIndex(300, 100, 60, 0)).toBe(0);
  });
});

describe('dragShift', () => {
  it('hace hueco hacia arriba al bajar y hacia abajo al subir', () => {
    expect([0, 1, 2, 3, 4].map((i) => dragShift(i, 1, 3))).toEqual([0, 0, -1, -1, 0]);
    expect([0, 1, 2, 3, 4].map((i) => dragShift(i, 3, 1))).toEqual([0, 1, 1, 0, 0]);
    expect([0, 1, 2].map((i) => dragShift(i, 1, 1))).toEqual([0, 0, 0]);
  });
});

describe('tipos de serie', () => {
  it('cada tipo tiene letra y nombre', () => {
    for (const t of SET_TYPES) expect(SET_NAMES[t]).toBeTruthy();
    expect(SET_LABEL.normal).toBe('');
    expect(SET_TYPES).toHaveLength(4);
  });
});
