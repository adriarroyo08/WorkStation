import { describe, expect, it } from 'vitest';
import { emptyData, normalizeData, workoutFromRoutine } from './data';
import type { Routine } from './types';

const routine = (): Routine => ({
  id: 'routine',
  name: 'Fuerza',
  exercises: [
    {
      exerciseId: 'press-banca',
      restSec: 90,
      sets: [
        { type: 'normal', weight: 80, reps: 12, repsMin: 8 },
        { type: 'warmup', weight: 40, reps: 10 },
      ],
    },
  ],
});

describe('rangos de repeticiones en los datos', () => {
  it('conserva rangos en el round-trip y los copia al entrenamiento', () => {
    const data = emptyData();
    data.routines = [routine()];
    data.workouts = [workoutFromRoutine(data.routines[0])];
    expect(data.workouts[0].exercises[0].sets).toEqual(data.routines[0].exercises[0].sets.map((s) => ({ ...s, done: false })));
    expect(normalizeData(JSON.parse(JSON.stringify(data)))).toEqual(data);
    expect(data.version).toBe(1);
  });
  it('descarta rangos inválidos al importar rutinas y entrenamientos sin mutar la entrada', () => {
    const data = emptyData();
    data.routines = [routine()];
    data.routines[0].exercises[0].sets[0].repsMin = 13;
    data.workouts = [workoutFromRoutine(data.routines[0])];
    const normalized = normalizeData(data);
    expect(normalized.routines[0].exercises[0].sets[0]).not.toHaveProperty('repsMin');
    expect(normalized.workouts[0].exercises[0].sets[0]).not.toHaveProperty('repsMin');
    expect(data.routines[0].exercises[0].sets[0].repsMin).toBe(13);
  });
  it.each(['duration', 'distance'] as const)('descarta el rango según el kind %s del ejercicio importado', (kind) => {
    const data = emptyData();
    data.exercises.push({ id: 'custom-range', name: 'Personalizado', muscle: 'otro', equipment: 'otro', custom: true, kind });
    const r = routine();
    r.exercises[0].exerciseId = 'custom-range';
    data.routines = [r];
    data.workouts = [workoutFromRoutine(r)];
    const normalized = normalizeData(data);
    expect(normalized.routines[0].exercises[0].sets[0]).not.toHaveProperty('repsMin');
    expect(normalized.workouts[0].exercises[0].sets[0]).not.toHaveProperty('repsMin');
  });
  it('mantiene las rutinas antiguas y la versión de datos', () => {
    const data = emptyData();
    const r = routine();
    delete r.exercises[0].sets[0].repsMin;
    data.routines = [r];
    expect(normalizeData(JSON.parse(JSON.stringify(data)))).toEqual(data);
    expect(workoutFromRoutine(r).exercises[0].sets[0]).not.toHaveProperty('repsMin');
  });
});
