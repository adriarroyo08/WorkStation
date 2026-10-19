import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { buildWatchState, finishWorkout, nextPendingSet, parseWatchCommand, summarizeHeartRate, toggleSet } from './session';
import type { Workout } from './types';

const base = (): Workout => ({
  id: 'w',
  name: 'Hoy',
  startedAt: '2026-10-18T10:00:00Z',
  exercises: [
    {
      exerciseId: 'press-banca',
      restSec: 120,
      supersetId: 's',
      sets: [
        { type: 'normal', done: false },
        { type: 'normal', done: false },
      ],
    },
    {
      exerciseId: 'remo-barra',
      restSec: 90,
      supersetId: 's',
      sets: [
        { type: 'normal', done: false },
        { type: 'normal', done: false },
      ],
    },
    { exerciseId: 'curl-barra', sets: [{ type: 'normal', done: false }] },
  ],
});

describe('sesión en curso', () => {
  const data = emptyData();
  data.workouts.push({ id: 'old', name: 'x', startedAt: '2026-10-10T10:00:00Z', exercises: [{ exerciseId: 'press-banca', sets: [{ type: 'normal', weight: 80, reps: 8, done: true }] }] });

  it('rellena con la sesión anterior y no descansa dentro de una superserie', () => {
    const r = toggleSet(data, base(), 0, 0);
    expect(r.workout.exercises[0].sets[0]).toMatchObject({ done: true, weight: 80, reps: 8 });
    expect(r.restSec).toBe(0);
    const r2 = toggleSet(data, r.workout, 1, 0, { weight: 50, reps: 10 });
    expect(r2.restSec).toBe(90);
    expect(r2.workout.exercises[1].sets[0]).toMatchObject({ weight: 50, reps: 10 });
  });
  it('la siguiente serie alterna en superseries', () => {
    let w = base();
    expect(nextPendingSet(w)).toEqual({ ei: 0, si: 0 });
    w = toggleSet(data, w, 0, 0).workout;
    expect(nextPendingSet(w)).toEqual({ ei: 1, si: 0 });
    w = toggleSet(data, w, 1, 0).workout;
    expect(nextPendingSet(w)).toEqual({ ei: 0, si: 1 });
  });
  it('desmarcar no inicia descanso', () => {
    const w = toggleSet(data, base(), 2, 0).workout;
    expect(toggleSet(data, w, 2, 0, {}, false)).toMatchObject({ restSec: 0 });
  });
  it('terminar descarta lo no completado', () => {
    expect(finishWorkout(base())).toBeNull();
    const w = toggleSet(data, base(), 2, 0).workout;
    expect(finishWorkout(w)!.exercises).toHaveLength(1);
  });
  it('estado para el reloj', () => {
    const st = buildWatchState(data, base(), { end: Date.now() + 30000, total: 60 });
    expect(st.active!.exercises[0].sets[0].prevWeight).toBe(80);
    expect(st.active!.cursor).toEqual({ ei: 0, si: 0 });
    expect(st.active!.restEnd).toBeGreaterThan(Date.now());
    expect(buildWatchState(data, null, { end: null, total: 0 }).active).toBeNull();
  });
  it('comandos del reloj', () => {
    expect(parseWatchCommand('{"type":"rest_skip"}')).toEqual({ type: 'rest_skip' });
    expect(parseWatchCommand('nope')).toBeNull();
  });
  it('resumen de pulso', () => {
    const t0 = Date.parse('2026-10-18T10:00:00Z');
    expect(
      summarizeHeartRate(t0, [
        { t: t0 + 5000, bpm: 100 },
        { t: t0 + 10000, bpm: 140 },
        { t: t0 + 15000, bpm: 300 },
      ]),
    ).toMatchObject({
      avg: 120,
      max: 140,
      min: 100,
      samples: [
        [5, 100],
        [10, 140],
      ],
    });
  });
});
