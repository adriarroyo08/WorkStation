import { afterEach, describe, expect, it } from 'vitest';
import { achievements, newlyUnlocked } from './achievements';
import { emptyData } from './data';
import { DEFAULT_EXERCISES } from './exercises';
import { normalizeRepRange, repTarget, suggestNext, weightStep } from './progression';
import type { WorkoutSet } from './types';
import { fmtWeight, fromUnit, setWeightUnit } from './units';

const ex = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id)!;
const sets = (...s: [number, number, number?][]): WorkoutSet[] => s.map(([weight, reps, rpe]) => ({ type: 'normal', weight, reps, rpe, done: true }));

afterEach(() => setWeightUnit('kg'));

describe.each(['kg', 'lb'] as const)('doble progresión en %s', (unit) => {
  const cases: [string, number[], number | undefined, number, string, string][] = [
    ['a: techo', [12, 12, 12], 8, 8, 'up', 'Llegaste a 3×12'],
    ['b: exigente', [12, 12, 12], 9.5, 12, 'repeat', 'RPE alto'],
    ['c: bajo el mínimo', [8, 8, 7], 9, 8, 'repeat', 'Quedaste por debajo de 8'],
    ['d: parcial', [12, 11, 10], 8, 11, 'reps', 'En rango'],
    ['d: en rango', [10, 10, 9], 8, 10, 'reps', 'En rango'],
    ['e: incompleta en techo', [12, 12], 8, 12, 'repeat', 'Te faltaron series'],
    ['e: incompleta en rango', [10, 9], 8, 10, 'repeat', 'Te faltaron series'],
    ['c antes de e', [7], 9, 8, 'repeat', 'Quedaste por debajo'],
    ['a: supera techo', [13, 12, 12], 8, 8, 'up', 'Llegaste'],
    ['a: sin RPE', [12, 12, 12], undefined, 8, 'up', 'Llegaste'],
    ['a: RPE límite', [12, 12, 12], 8.5, 8, 'up', 'Llegaste'],
  ];
  it.each(cases)('%s', (_name, reps, rpe, expectedReps, action, reason) => {
    setWeightUnit(unit);
    const top = fromUnit(unit === 'kg' ? 80 : 175);
    const next = fromUnit(unit === 'kg' ? 82.5 : 180);
    const result = suggestNext(sets(...reps.map((r): [number, number, number?] => [top, r, rpe])), ex('press-banca'), { min: 8, max: 12, plannedSets: 3 });
    expect(result).toMatchObject({ weight: action === 'up' ? next : top, reps: expectedReps, action, reason: expect.stringContaining(reason) });
    expect(result!.reason).toContain(fmtWeight(top));
  });
  it.each(['warmup', 'drop', 'backoff', 'undone'] as const)('ignora %s aunque tenga más peso y RPE', (type) => {
    setWeightUnit(unit);
    const top = fromUnit(unit === 'kg' ? 80 : 175);
    const extra: WorkoutSet = { type: type === 'warmup' || type === 'drop' ? type : 'normal', done: type !== 'undone', weight: type === 'backoff' ? top - 10 : top + 10, reps: 1, rpe: 10 };
    expect(suggestNext([...sets([top, 12], [top, 12], [top, 12]), extra], ex('press-banca'), { min: 8, max: 12, plannedSets: 3 })).toMatchObject({ action: 'up', reps: 8 });
  });
  it('solo cuenta las series al peso máximo para completar el plan', () => {
    setWeightUnit(unit);
    const top = fromUnit(unit === 'kg' ? 82.5 : 180);
    expect(suggestNext(sets([top, 12], [top - 2, 12], [top - 2, 10]), ex('press-banca'), { min: 8, max: 12, plannedSets: 3 })).toMatchObject({ weight: top, reps: 12, action: 'repeat' });
  });
  it('cuenta failure y usa el número de series al máximo cuando no hay plan', () => {
    setWeightUnit(unit);
    expect(suggestNext([{ type: 'failure', done: true, weight: fromUnit(80), reps: 12 }], ex('press-banca'), { min: 8, max: 12 })).toMatchObject({ action: 'up', reps: 8 });
  });
  it('respeta el incremento de mancuernas', () => {
    setWeightUnit(unit);
    expect(suggestNext(sets([fromUnit(unit === 'kg' ? 24 : 25), 12]), ex('curl-mancuernas'), { min: 8, max: 12 })).toMatchObject({ weight: fromUnit(unit === 'kg' ? 26 : 30), reps: 8 });
  });
});

describe('compatibilidad y llamadores de rangos', () => {
  it.each(['press-banca', 'dominadas', 'plancha'])('rango degenerado equivale al escalar para %s', (id) => {
    const prev = [...sets([80, 8, 9]), { type: 'drop' as const, weight: 90, reps: 6, durationSec: 30, done: true }];
    expect(suggestNext(prev, ex(id), { min: 8, max: 8, plannedSets: 3 })).toEqual(suggestNext(prev, ex(id), 8));
  });
  it.each(['reps', 'assisted'] as const)('limita %s al techo y explica cómo progresar', (kind) => {
    const exercise = { ...ex('dominadas'), kind };
    expect(suggestNext(sets([20, 10]), exercise, { min: 8, max: 12 })).toMatchObject({ reps: 11, action: 'reps' });
    for (const reps of [12, 15])
      expect(suggestNext(sets([20, reps]), exercise, { min: 8, max: 12 })).toMatchObject({
        reps: 12,
        action: 'repeat',
        reason: expect.stringContaining(kind === 'assisted' ? 'menos asistencia' : 'lastre'),
      });
  });
  it('no sugiere con solo calentamiento, drop o series sin hacer', () => {
    expect(
      suggestNext(
        [
          { type: 'drop', done: true, weight: 80, reps: 12 },
          { type: 'normal', done: false },
        ],
        ex('press-banca'),
        { min: 8, max: 12 },
      ),
    ).toBeNull();
  });
  it('extrae rango y plan sin cambiar objetivos fijos', () => {
    expect(repTarget({ type: 'normal', repsMin: 8, reps: 12 }, 3)).toEqual({ min: 8, max: 12, plannedSets: 3 });
    expect(repTarget({ type: 'normal', reps: 12 }, 3)).toBe(12);
    expect(repTarget({ type: 'normal' })).toBeUndefined();
  });
});

describe('progresión', () => {
  it('incrementos por material', () => {
    expect(weightStep(ex('sentadilla'))).toBe(5);
    expect(weightStep(ex('press-banca'))).toBe(2.5);
    expect(weightStep(ex('curl-mancuernas'))).toBe(2);
  });
  it('sube peso si completó todas las reps', () => {
    expect(suggestNext(sets([80, 8], [80, 8], [80, 8]), ex('press-banca'), 8)).toMatchObject({ weight: 82.5, reps: 8, action: 'up' });
    expect(suggestNext(sets([47, 8]), ex('press-militar'), 8)).toMatchObject({ weight: 50 });
    expect(suggestNext(sets([100, 5]), ex('sentadilla'), 5)).toMatchObject({ weight: 105 });
  });
  it('repite si faltaron reps', () => {
    expect(suggestNext(sets([80, 8], [80, 7], [80, 6]), ex('press-banca'), 8)).toMatchObject({ weight: 80, reps: 8, action: 'repeat' });
  });
  it('con RPE alto busca una rep más', () => {
    expect(suggestNext(sets([100, 5, 9.5], [100, 5, 9]), ex('sentadilla'), 5)).toMatchObject({ weight: 100, reps: 6, action: 'reps' });
  });
  it('peso corporal y tiempo', () => {
    expect(suggestNext(sets([0, 10], [0, 8]), ex('dominadas'))).toMatchObject({ reps: 11 });
    expect(suggestNext([{ type: 'normal', durationSec: 60, done: true }], ex('plancha'))).toMatchObject({ durationSec: 65 });
    expect(suggestNext([], ex('press-banca'))).toBeNull();
  });
});

describe('logros', () => {
  it('desbloquea y detecta nuevos', () => {
    const d = emptyData();
    d.workouts.push({ id: 'a', name: 'x', startedAt: '2026-10-01T06:00:00', endedAt: '2026-10-01T07:00:00', exercises: [{ exerciseId: 'press-banca', sets: sets([100, 1]) }] });
    const got = achievements(d, new Date('2026-10-02T12:00:00'));
    expect(got.find((a) => a.id === 'w1')!.unlocked).toBe(true);
    expect(got.find((a) => a.id === 'b100')!.unlocked).toBe(true);
    expect(got.find((a) => a.id === 'early')!.unlocked).toBe(true);
    expect(got.find((a) => a.id === 'w10')!.progress).toEqual([1, 10]);
    expect(newlyUnlocked(d, 'a', new Date('2026-10-02T12:00:00')).map((a) => a.id)).toEqual(expect.arrayContaining(['w1', 'b100', 'early']));
  });
});

describe('normalizeRepRange', () => {
  it.each(['weight_reps', 'reps', 'assisted'] as const)('conserva rangos válidos para %s', (kind) => {
    for (const [repsMin, reps] of [
      [1, 100],
      [8, 12],
      [99, 100],
    ]) {
      const set = { repsMin, reps, weight: 80 };
      expect(normalizeRepRange(set, kind)).toEqual(set);
    }
  });
  it.each([
    [0, 12],
    [-1, 12],
    [8.5, 12],
    [8, 12.5],
    [8, 101],
    [101, 102],
    [8, 8],
    [12, 8],
    [8, undefined],
    [undefined, 12],
    [NaN, 12],
    [8, Infinity],
    ['8', 12],
    [8, '12'],
    [null, 12],
    [8, 0],
  ])('descarta el suelo inválido %s con techo %s', (repsMin, reps) => {
    const set = { repsMin, reps, weight: 80 } as unknown as WorkoutSet;
    expect(normalizeRepRange(set, 'weight_reps')).toEqual({ reps, weight: 80 });
    expect(set).toHaveProperty('repsMin', repsMin);
  });
  it.each(['duration', 'distance'] as const)('descarta rangos para %s', (kind) => {
    expect(normalizeRepRange({ reps: 12, repsMin: 8, durationSec: 30 }, kind)).toEqual({ reps: 12, durationSec: 30 });
  });
  it('conserva objetivos fijos sin añadir campos', () => {
    expect(normalizeRepRange({ reps: 8 }, 'weight_reps')).toEqual({ reps: 8 });
  });
});
