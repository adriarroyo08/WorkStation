import { describe, expect, it } from 'vitest';
import { achievements, newlyUnlocked } from './achievements';
import { emptyData } from './data';
import { DEFAULT_EXERCISES } from './exercises';
import { suggestNext, weightStep } from './progression';
import type { WorkoutSet } from './types';

const ex = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id)!;
const sets = (...s: [number, number, number?][]): WorkoutSet[] => s.map(([weight, reps, rpe]) => ({ type: 'normal', weight, reps, rpe, done: true }));

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
