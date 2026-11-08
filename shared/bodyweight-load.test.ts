import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { bodyweightAt, bodyweightE1RM, bodyweightHistory, effectiveLoadKg, FULL_BODYWEIGHT_EXERCISES, usesFullBodyweight } from './bodyweight-load';
import { exerciseHistory, personalRecords, workoutVolume } from './stats';
import { strengthLevels } from './strength';

const set = { type: 'normal' as const, weight: 10, reps: 5, done: true };
function fixture() {
  const data = emptyData();
  data.measurements = [
    { id: 'later', date: '2026-11-01', bodyweight: 100 },
    { id: 'first', date: '2026-01-01', bodyweight: 80 },
    { id: 'other', date: '2026-03-01', waist: 90 },
  ];
  data.workouts = [
    { id: 'w', name: 'Dominadas', startedAt: '2026-02-01', exercises: [{ exerciseId: 'dominadas', sets: [set, { ...set, weight: 200, type: 'warmup' }, { ...set, weight: 300, done: false }] }] },
  ];
  return data;
}
describe('carga de peso corporal', () => {
  it('limita la carga a la lista explicita de ejercicios de peso corporal completo', () => {
    expect(FULL_BODYWEIGHT_EXERCISES).toEqual(['dominadas', 'dominadas-supinas', 'dominadas-asistidas', 'fondos', 'fondos-triceps']);
    for (const id of FULL_BODYWEIGHT_EXERCISES) {
      expect(usesFullBodyweight(id, 'reps')).toBe(true);
      expect(usesFullBodyweight(id, 'assisted')).toBe(true);
      expect(usesFullBodyweight(id, 'weight_reps')).toBe(false);
      expect(usesFullBodyweight(id, undefined)).toBe(false);
    }
    const d = fixture();
    d.workouts[0].exercises[0].exerciseId = 'flexiones';
    for (const kind of ['reps', 'assisted'] as const) {
      d.exercises.find((e) => e.id === 'flexiones')!.kind = kind;
      expect(usesFullBodyweight('flexiones', kind)).toBe(false);
      expect(effectiveLoadKg(set, kind, 80, 'flexiones')).toBeUndefined();
      expect(bodyweightHistory(d, 'flexiones')).toEqual([]);
      expect(bodyweightE1RM(d, 'flexiones')).toBeUndefined();
    }
  });
  it('elige la última medida anterior o la primera posterior sin mutar las medidas', () => {
    const d = fixture();
    expect(bodyweightAt(d, '2026-02-01')).toBe(80);
    expect(bodyweightAt(d, '2026-01-01')).toBe(80);
    expect(bodyweightAt(d, '2025-01-01')).toBe(80);
    expect(bodyweightAt(d, '2027-01-01')).toBe(100);
    expect(d.measurements[0].id).toBe('later');
    d.measurements = [{ id: 'x', date: '2026-01-01', bodyweight: 0 }];
    expect(bodyweightAt(d, '2026-02-01')).toBeUndefined();
  });
  it('suma lastre, resta ayuda y limita la carga asistida a cero', () => {
    expect(effectiveLoadKg(set, 'reps', 80, 'dominadas')).toBe(90);
    expect(effectiveLoadKg({ ...set, weight: undefined }, 'reps', 80, 'dominadas')).toBe(80);
    expect(effectiveLoadKg({ ...set, weight: 20, reps: 8 }, 'assisted', 80, 'dominadas-asistidas')).toBe(60);
    expect(effectiveLoadKg({ ...set, weight: 90 }, 'assisted', 80, 'dominadas-asistidas')).toBe(0);
    expect(effectiveLoadKg(set, 'weight_reps', 80, 'dominadas')).toBeUndefined();
    expect(effectiveLoadKg(set, 'reps', undefined, 'dominadas')).toBeUndefined();
  });
  it('estima la mejor marca con el peso histórico y conserva volumen y récords', () => {
    const d = fixture();
    const before = { history: exerciseHistory(d, 'dominadas'), records: personalRecords(d), volume: workoutVolume(d.workouts[0], d.exercises) };
    expect(bodyweightE1RM(d, 'dominadas')).toBe(105);
    expect(bodyweightHistory(d, 'dominadas')[0]).toMatchObject({ totalLoad: 90, bodyweight1RM: 105, bodyweight: 80 });
    expect(strengthLevels(d)[0]).toMatchObject({ value: 5, unit: 'reps', ballastRatio: 0.31 });
    expect({ history: exerciseHistory(d, 'dominadas'), records: personalRecords(d), volume: workoutVolume(d.workouts[0], d.exercises) }).toEqual(before);
    d.measurements = [];
    expect(bodyweightE1RM(d, 'dominadas')).toBeUndefined();
    expect(strengthLevels(d)[0].ballastRatio).toBeUndefined();
    expect(bodyweightE1RM(d, 'press-banca')).toBeUndefined();
  });
  it('estima los asistidos y elige la mejor sesión', () => {
    const d = fixture();
    d.exercises.find((e) => e.id === 'dominadas')!.kind = 'assisted';
    d.workouts[0].exercises[0].sets = [{ ...set, weight: 20, reps: 8 }];
    expect(bodyweightHistory(d, 'dominadas')[0]).toMatchObject({ totalLoad: 60, bodyweight1RM: 76 });
    d.workouts.push({ id: 'w2', name: 'x', startedAt: '2026-12-01', exercises: [{ exerciseId: 'dominadas', sets: [{ ...set, reps: 1, weight: 10 }] }] });
    expect(bodyweightE1RM(d, 'dominadas')).toBe(90);
    expect(strengthLevels(d)[0].ballastRatio).toBeUndefined();
  });
});
