import { describe, expect, it } from 'vitest';
import { parseStopwatch, pauseStopwatch, plannedDurationSec, resumeStopwatch, shouldNotifyTarget, startStopwatch, stopwatchElapsedSec, stopwatchMatches, stopwatchTarget } from './stopwatch';
import { formatSeconds, formatSet } from './stats';
import type { Exercise, Routine, Workout } from './types';

const ref = { workoutId: 'w', exerciseId: 'plancha', ei: 0, si: 1 };
const T0 = 1_000_000;

describe('cronómetro de serie', () => {
  it('cuenta con el reloj real, aunque la app no haya hecho nada entretanto', () => {
    expect(stopwatchElapsedSec(startStopwatch(ref, T0), T0 + 95_400)).toBe(95);
  });

  it('una pausa congela el tiempo y reanudar sigue sumando', () => {
    const paused = pauseStopwatch(startStopwatch(ref, T0), T0 + 10_000);
    expect(stopwatchElapsedSec(paused, T0 + 500_000)).toBe(10);
    const resumed = resumeStopwatch(paused, T0 + 500_000);
    expect(stopwatchElapsedSec(resumed, T0 + 505_000)).toBe(15);
  });

  it('pausar dos veces o reanudar en marcha no altera el tiempo', () => {
    const running = startStopwatch(ref, T0);
    expect(resumeStopwatch(running, T0 + 5_000)).toBe(running);
    const paused = pauseStopwatch(running, T0 + 5_000);
    expect(pauseStopwatch(paused, T0 + 9_000)).toBe(paused);
  });

  it('un reloj que retrocede nunca da tiempo negativo', () => {
    expect(stopwatchElapsedSec(startStopwatch(ref, T0), T0 - 5_000)).toBe(0);
  });

  it('sobrevive a guardarlo y leerlo de nuevo, como al recargar', () => {
    const paused = pauseStopwatch(startStopwatch(ref, T0, 60), T0 + 12_000);
    const restored = parseStopwatch(JSON.parse(JSON.stringify(paused)));
    expect(restored).toEqual(paused);
    expect(stopwatchElapsedSec(restored!, T0 + 99_000)).toBe(12);
  });

  it.each([null, 'x', {}, { ...ref, startedAt: 'ayer', accumulatedMs: 0 }, { ...ref, ei: 0.5, startedAt: 1, accumulatedMs: 0 }])('ignora lo guardado con otra forma: %j', (raw) => {
    expect(parseStopwatch(raw)).toBeNull();
  });
});

describe('aviso de objetivo', () => {
  it('avisa al llegar y no antes', () => {
    const sw = startStopwatch(ref, T0, 60);
    expect(shouldNotifyTarget(sw, T0 + 59_999)).toBe(false);
    expect(shouldNotifyTarget(sw, T0 + 60_000)).toBe(true);
  });

  it('no repite el aviso ya dado', () => {
    expect(shouldNotifyTarget({ ...startStopwatch(ref, T0, 60), targetNotified: true }, T0 + 90_000)).toBe(false);
  });

  it('sin objetivo no hay aviso', () => {
    expect(shouldNotifyTarget(startStopwatch(ref, T0), T0 + 90_000)).toBe(false);
  });

  it('el objetivo es el mayor entre lo planificado y lo que tiene la serie', () => {
    expect(stopwatchTarget(60, 60)).toBe(60);
    expect(stopwatchTarget(60, 65)).toBe(65); // sugerencia aplicada
    expect(stopwatchTarget(60, 42)).toBe(60); // tiempo guardado antes, por debajo del plan
    expect(stopwatchTarget(undefined, 45)).toBe(45); // escrito a mano
    expect(stopwatchTarget(undefined, undefined)).toBeUndefined();
    expect(stopwatchTarget(0, 0)).toBeUndefined();
  });
});

describe('a qué serie pertenece', () => {
  const w: Workout = {
    id: 'w',
    name: 'Core',
    startedAt: new Date(T0).toISOString(),
    exercises: [
      {
        exerciseId: 'plancha',
        sets: [
          { type: 'normal', done: true },
          { type: 'normal', done: false },
        ],
      },
    ],
  };

  it('vale mientras la serie siga pendiente', () => {
    expect(stopwatchMatches(startStopwatch(ref, T0), w)).toBe(true);
  });

  it('no vale en otro entreno, con otro ejercicio, en una serie borrada o completada', () => {
    expect(stopwatchMatches(startStopwatch({ ...ref, workoutId: 'otro' }, T0), w)).toBe(false);
    expect(stopwatchMatches(startStopwatch({ ...ref, exerciseId: 'sentadilla' }, T0), w)).toBe(false);
    expect(stopwatchMatches(startStopwatch({ ...ref, si: 5 }, T0), w)).toBe(false);
    expect(stopwatchMatches(startStopwatch({ ...ref, si: 0 }, T0), w)).toBe(false);
  });

  const routine: Routine = {
    id: 'r',
    name: 'Core',
    exercises: [
      { exerciseId: 'sentadilla', restSec: 90, sets: [{ type: 'normal', reps: 5 }] },
      {
        exerciseId: 'plancha',
        restSec: 60,
        sets: [
          { type: 'normal', durationSec: 45 },
          { type: 'normal', durationSec: 60 },
        ],
      },
    ],
  };

  it('lee la duración planificada de su serie', () => {
    expect(plannedDurationSec(routine, 1, 'plancha', 1)).toBe(60);
  });

  it('encuentra el ejercicio aunque se haya reordenado', () => {
    expect(plannedDurationSec(routine, 0, 'plancha', 0)).toBe(45);
  });

  it('sin rutina, o si la rutina no tiene ese ejercicio, no hay plan', () => {
    expect(plannedDurationSec(undefined, 0, 'plancha', 0)).toBeUndefined();
    expect(plannedDurationSec(routine, 0, 'remo', 0)).toBeUndefined();
  });
});

describe('formato del tiempo de una serie', () => {
  const plank: Exercise = { id: 'plancha', name: 'Plancha', muscle: 'core', equipment: 'peso corporal', kind: 'duration' } as Exercise;

  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [59, '59 s'],
    [60, '1:00'],
    [65, '1:05'],
    [600, '10:00'],
    [3725, '1:02:05'],
  ])('%i segundos se muestran como %s', (sec, text) => {
    expect(formatSeconds(sec)).toBe(text);
  });

  it('una serie por tiempo nunca se muestra como repeticiones', () => {
    expect(formatSet({ type: 'normal', durationSec: 75, done: true }, plank)).toBe('1:15');
    expect(formatSet({ type: 'normal', durationSec: 30, reps: 8, done: true }, plank)).toBe('30 s');
    expect(formatSet({ type: 'normal', durationSec: 30, weight: 10, done: true }, plank)).toBe('30 s con 10kg');
  });
});
