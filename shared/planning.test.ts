import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { compareWithPrevious, muscleRecovery, nextRoutine, recoveryHours } from './planning';
import type { Routine, Workout, WorkoutSet } from './types';

const sets = (n: number, weight = 50, reps = 10): WorkoutSet[] => Array.from({ length: n }, () => ({ type: 'normal', weight, reps, done: true }));
const routine = (id: string, folderId?: string): Routine => ({ id, name: id, folderId, exercises: [{ exerciseId: 'press-banca', restSec: 90, sets: [{ type: 'normal', reps: 8 }] }] });
const workout = (id: string, at: string, routineId?: string, exerciseId = 'press-banca', n = 3): Workout => ({
  id,
  name: routineId ?? 'Libre',
  startedAt: at,
  endedAt: at,
  routineId,
  exercises: [{ exerciseId, sets: sets(n) }],
});

describe('siguiente rutina', () => {
  it('rota dentro de la carpeta', () => {
    const d = emptyData();
    d.folders.push({ id: 'f', name: 'PPL' });
    d.routines.push(routine('empuje', 'f'), routine('tiron', 'f'), routine('pierna', 'f'));
    expect(nextRoutine(d)?.routine.id).toBe('empuje');
    d.workouts.push(workout('1', '2026-10-01T10:00:00Z', 'empuje'));
    expect(nextRoutine(d)?.routine.id).toBe('tiron');
    d.workouts.push(workout('2', '2026-10-03T10:00:00Z', 'pierna'));
    const n = nextRoutine(d)!;
    expect(n.routine.id).toBe('empuje');
    expect(n.last?.id).toBe('1');
  });
  it('entre rutinas sueltas elige la más olvidada', () => {
    const d = emptyData();
    d.routines.push(routine('a'), routine('b'), routine('c'));
    d.workouts.push(workout('1', '2026-10-01T10:00:00Z', 'a'), workout('2', '2026-10-02T10:00:00Z', 'b'));
    expect(nextRoutine(d)?.routine.id).toBe('c');
    expect(nextRoutine(emptyData())).toBeNull();
  });
});

describe('recuperación muscular', () => {
  it('se recupera con el tiempo y acumula sesiones', () => {
    const d = emptyData();
    const now = Date.parse('2026-10-05T10:00:00Z');
    d.workouts.push(workout('1', '2026-10-05T08:00:00Z', undefined, 'press-banca', 4));
    const r = muscleRecovery(d, now);
    expect(r[0].muscle).toBe('pecho');
    expect(r[0].recovery).toBeCloseTo(2 / 36, 2);
    expect(r.find((x) => x.muscle === 'triceps')).toBeTruthy();
    expect(muscleRecovery(d, now + 40 * 3600_000).find((x) => x.muscle === 'pecho')).toBeUndefined();
    d.workouts.push(workout('2', '2026-10-04T08:00:00Z', undefined, 'press-banca', 4));
    expect(muscleRecovery(d, now)[0].recovery).toBe(0);
    expect(recoveryHours(20)).toBe(72);
  });
});

describe('comparación con la sesión anterior', () => {
  it('busca la misma rutina', () => {
    const d = emptyData();
    d.workouts.push(workout('1', '2026-10-01T10:00:00Z', 'r', 'press-banca', 3), workout('2', '2026-10-02T10:00:00Z', 'otra'), workout('3', '2026-10-04T10:00:00Z', 'r', 'press-banca', 4));
    const c = compareWithPrevious(d, '3')!;
    expect(c.previous.id).toBe('1');
    expect(c.sets).toEqual([4, 3]);
    expect(c.volume).toEqual([2000, 1500]);
    expect(compareWithPrevious(d, '1')).toBeNull();
  });
});
