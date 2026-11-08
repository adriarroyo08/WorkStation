import { afterEach, describe, expect, it } from 'vitest';
import { historyDate, historyMonth, historyRowSummary } from './history';
import type { Exercise, Workout } from './types';
import { setWeightUnit } from './units';

const exercises: Exercise[] = [{ id: 'press', name: 'Press', muscle: 'pecho', equipment: 'barra', kind: 'weight' }];
const workout: Workout = {
  id: 'w',
  name: 'Torso',
  startedAt: '2026-10-30T12:00:00',
  endedAt: '2026-10-30T13:00:00',
  exercises: [
    {
      exerciseId: 'press',
      sets: [
        { type: 'normal', weight: 50, reps: 10, done: true },
        { type: 'warmup', weight: 20, reps: 10, done: true },
        { type: 'normal', weight: 50, reps: 10, done: false },
      ],
    },
  ],
};
const now = new Date('2026-11-08T12:00:00');
afterEach(() => setWeightUnit('kg'));

describe('formato del historial', () => {
  it('conserva las fechas locales, las abreviaturas y el año solo para otros años', () => {
    expect(historyDate(workout.startedAt, now)).toBe('VIE 30 OCT');
    expect(historyDate('2025-01-01T12:00:00', now)).toBe('MIÉ 1 ENE 2025');
    expect(historyMonth(workout.startedAt)).toBe('octubre de 2026');
    expect(historyDate(workout.startedAt, new Date('2027-01-01T12:00:00'))).toBe('VIE 30 OCT 2026');
  });

  it('mantiene estadísticas y nombre accesible con todo el texto visible', () => {
    expect(historyRowSummary(workout, exercises, 2, now)).toEqual({
      date: 'VIE 30 OCT',
      volume: '500 kg',
      duration: 60,
      sets: 1,
      lines: ['3 × Press'],
      extra: '',
      label: 'VIE 30 OCT Torso 2 60 min 500 kg 1 series 3 × Press',
    });
  });

  it('respeta libras y actualizaciones del catálogo, sin reutilizar datos obsoletos', () => {
    setWeightUnit('lb');
    const summary = historyRowSummary(workout, [{ ...exercises[0], name: 'Press nuevo' }], 0, now);
    expect(summary.volume).toBe('1102 lb');
    expect(summary.label).toBe('VIE 30 OCT Torso 60 min 1102 lb 1 series 3 × Press nuevo');
  });

  it('incluye pulso, ejercicios desconocidos y el número de ejercicios adicionales', () => {
    const summary = historyRowSummary(
      { ...workout, heartRate: { avg: 120, min: 80, max: 150 }, exercises: Array.from({ length: 6 }, () => ({ exerciseId: 'desconocido', sets: [] })), endedAt: undefined },
      exercises,
      0,
      now,
    );
    expect(summary.lines).toEqual(Array(4).fill('0 × desconocido'));
    expect(summary.extra).toBe('+ 2 más');
    expect(summary.label).toBe('VIE 30 OCT Torso 0 min 0 kg 0 series 120 ppm 0 × desconocido 0 × desconocido 0 × desconocido 0 × desconocido + 2 más');
  });
});
