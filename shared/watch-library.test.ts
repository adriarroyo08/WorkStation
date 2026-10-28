import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { buildWatchLibrary, parseWatchWorkout } from './watch-library';

describe('reloj autónomo', () => {
  const data = () => {
    const d = emptyData();
    d.folders.push({ id: 'f', name: 'Torso' });
    d.routines.push({ id: 'r', name: 'Push', folderId: 'f', exercises: [{ exerciseId: 'press-banca', restSec: 120, sets: [{ type: 'warmup', weight: 40, reps: 10 }, { type: 'normal', weight: 80, reps: 8 }] }] });
    d.workouts.push({ id: 'w1', name: 'Push', startedAt: '2026-10-01T10:00:00Z', endedAt: '2026-10-01T11:00:00Z', exercises: [{ exerciseId: 'press-banca', sets: [{ type: 'normal', weight: 75, reps: 8, done: true }, { type: 'normal', weight: 99, reps: 1, done: false }] }] });
    d.workouts.push({ id: 'w2', name: 'Push', startedAt: '2026-10-08T10:00:00Z', exercises: [{ exerciseId: 'press-banca', sets: [{ type: 'normal', weight: 80, reps: 8, done: true }] }] });
    return d;
  };

  it('el paquete lleva rutinas, carpeta, última sesión y recientes', () => {
    const lib = buildWatchLibrary(data(), 1);
    expect(lib.routines[0]).toMatchObject({ name: 'Push', folder: 'Torso', exercises: [{ id: 'press-banca', rest: 120, sets: [{ t: 'warmup', w: 40, r: 10 }, { t: 'normal', w: 80, r: 8 }] }] });
    expect(lib.prev['press-banca']).toEqual([{ t: 'normal', w: 80, r: 8 }]);
    expect(lib.recent.map((w) => w.id)).toEqual(['w2', 'w1']);
    expect(lib.exercises.some((e) => e.id === 'press-banca')).toBe(true);
    expect(JSON.stringify(lib).length).toBeLessThan(90_000);
  });

  it('valida el entreno que llega del reloj y quita lo que no sirve', () => {
    const d = data();
    expect(parseWatchWorkout('no json', d)).toBeNull();
    expect(parseWatchWorkout(JSON.stringify({ id: 'x', name: 'A', startedAt: 'mal', exercises: [] }), d)).toBeNull();
    const w = parseWatchWorkout(
      JSON.stringify({
        id: 'x',
        name: 'Reloj',
        startedAt: '2026-10-09T10:00:00Z',
        exercises: [
          { exerciseId: 'press-banca', sets: [{ type: 'normal', weight: 82.5, reps: 6, done: true }, { type: 'normal', done: false }] },
          { exerciseId: 'no-existe', sets: [{ type: 'normal', reps: 5, done: true }] },
        ],
      }),
      d,
    );
    expect(w?.exercises).toEqual([{ exerciseId: 'press-banca', sets: [{ type: 'normal', weight: 82.5, reps: 6, done: true }] }]);
  });
});
