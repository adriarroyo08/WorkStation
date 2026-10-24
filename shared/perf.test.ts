// Regresiones de rendimiento con historiales grandes (años de entrenos).
import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { inPeriod, period, weekStreak } from './reports';
import { achievements } from './achievements';
import type { WorkstationData } from './types';

function big(n: number, gapEvery = 0): WorkstationData {
  const d = emptyData();
  const now = new Date('2026-10-24T12:00:00');
  for (let i = 0; i < n; i++) {
    if (gapEvery && i % gapEvery === 0) continue;
    const t = new Date(now.getTime() - i * 1.6 * 864e5).toISOString();
    d.workouts.push({ id: `w${i}`, name: 'x', startedAt: t, endedAt: t, exercises: [{ exerciseId: 'press-banca', sets: [{ type: 'normal', weight: 60, reps: 8, done: true }] }] });
  }
  return d;
}

// Implementación de referencia (la antigua, cuadrática) para comprobar que el resultado no cambia.
function naiveStreak(data: WorkstationData, now: Date) {
  let streak = 0;
  for (let i = 0; i < 520; i++) {
    const p = period('week', -i, true, now);
    const n = data.workouts.filter((w) => inPeriod(w, p)).length;
    if (n > 0) streak++;
    else if (i > 0) break;
  }
  return streak;
}

describe('rendimiento con muchos entrenos', () => {
  it('la racha coincide con la implementación de referencia', () => {
    const now = new Date('2026-10-24T12:00:00');
    for (const d of [big(300), big(300, 37), emptyData()]) expect(weekStreak(d, true, now)).toBe(naiveStreak(d, now));
  });
  it('racha y logros con 5.000 entrenos en poco tiempo', () => {
    const d = big(5000);
    const t0 = performance.now();
    weekStreak(d);
    achievements(d);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});
