import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { volumeEquivalence, yearWrapped } from './wrapped';
import type { WorkoutSet } from './types';

const sets = (w: number, reps: number, n = 3): WorkoutSet[] => Array.from({ length: n }, () => ({ type: 'normal', weight: w, reps, done: true }));

describe('resumen anual', () => {
  it('equivalencias', () => {
    expect(volumeEquivalence(12_000)).toBe('2 elefantes');
    expect(volumeEquivalence(2_250)).toBe('1,5 coches');
    expect(volumeEquivalence(300)).toBe('1 piano de cola');
  });
  it('cifras, favoritos, mejora y racha', () => {
    const d = emptyData();
    const add = (id: string, date: string, w: number) =>
      d.workouts.push({ id, name: 'x', startedAt: date, endedAt: new Date(Date.parse(date) + 3600e3).toISOString(), exercises: [{ exerciseId: 'press-banca', sets: sets(w, 5) }] });
    add('a', '2025-03-03T08:00:00', 60);
    add('b', '2025-03-10T08:30:00', 70);
    add('c', '2025-03-17T09:00:00', 80);
    add('d', '2025-06-02T19:00:00', 85);
    add('z', '2024-12-01T08:00:00', 100); // otro año: no cuenta
    const y = yearWrapped(d, 2025);
    expect(y).toMatchObject({
      year: 2025,
      workouts: 4,
      hours: 4,
      topExercise: { id: 'press-banca', sessions: 4 },
      bestMonth: { label: 'Marzo', workouts: 3 },
      favoriteDay: 'lunes',
      timeOfDay: 'mañana',
      longestStreak: 3,
    });
    expect(y.biggestGain).toMatchObject({ from: 70, to: 99.2 });
    expect(y.topMuscle?.label).toBe('Pecho');
  });
});
