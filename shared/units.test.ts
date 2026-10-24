import { afterEach, describe, expect, it } from 'vitest';
import { fmtMass, fmtWeight, fromUnit, setWeightUnit, toUnit } from './units';
import { formatSet } from './stats';
import { suggestNext } from './progression';
import { DEFAULT_EXERCISES } from './exercises';

afterEach(() => setWeightUnit('kg'));

describe('unidades', () => {
  it('convierte sin derivar', () => {
    expect(toUnit(100, 'lb')).toBe(220.5);
    expect(toUnit(fromUnit(185, 'lb'), 'lb')).toBe(185);
    expect(fmtWeight(82.5)).toBe('82,5 kg');
    setWeightUnit('lb');
    expect(fmtWeight(fromUnit(225))).toBe('225 lb');
    expect(fmtMass(10_000)).toBe('22k lb');
    expect(fmtMass(10_000, 'kg')).toBe('10 t');
  });
  it('series y progresión en libras', () => {
    setWeightUnit('lb');
    const bench = DEFAULT_EXERCISES.find((e) => e.id === 'press-banca')!;
    expect(formatSet({ type: 'normal', weight: fromUnit(135), reps: 8, done: true }, bench)).toBe('135lb × 8');
    const s = suggestNext([{ type: 'normal', weight: fromUnit(135), reps: 8, done: true }], bench, 8)!;
    expect(toUnit(s.weight!)).toBe(140); // +5 lb
    expect(s.reason).toContain('140 lb');
  });
});
