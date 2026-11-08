import { expect, test } from 'vitest';
import { performanceData } from './perf-data';
import { DEFAULT_SETTINGS } from './types';
import { normalizeData } from './data';

test('la referencia reproduce dos años de datos válidos sin aleatoriedad ni mutaciones', () => {
  const data = performanceData(DEFAULT_SETTINGS);
  expect(data).toEqual(performanceData(DEFAULT_SETTINGS));
  expect(data.workouts).toHaveLength(416);
  expect(new Set(data.workouts.map((w) => w.id)).size).toBe(416);
  const normalized = normalizeData(data);
  const ids = new Set(normalized.exercises.map((e) => e.id));
  for (const w of data.workouts) {
    expect(w.exercises).toHaveLength(6);
    expect(Date.parse(w.endedAt!) - Date.parse(w.startedAt)).toBe(3600000);
    for (const e of w.exercises) {
      expect(ids.has(e.exerciseId)).toBe(true);
      expect(e.sets).toHaveLength(4);
      expect(e.sets.every((s) => s.done && s.weight! > 0 && s.reps! > 0)).toBe(true);
    }
  }
  expect(data.routines).toHaveLength(4);
  expect(data.measurements).toHaveLength(104);
  data.settings.weeklyGoal = 9;
  expect(DEFAULT_SETTINGS.weeklyGoal).toBe(3);
});
