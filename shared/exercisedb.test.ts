import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES } from './exercises';
import { autoLink, bestMatch, searchExdb, type ExdbExercise } from './exercisedb';
import { normalizeData } from './data';

// Muestra con nombres reales de ExerciseDB.
const LIST: ExdbExercise[] = [
  { id: '0025', name: 'barbell bench press' },
  { id: '0289', name: 'dumbbell bench press' },
  { id: '0047', name: 'barbell incline bench press' },
  { id: '0314', name: 'dumbbell incline bench press' },
  { id: '0043', name: 'barbell full squat' },
  { id: '0032', name: 'barbell deadlift' },
  { id: '0085', name: 'barbell romanian deadlift' },
  { id: '0652', name: 'pull-up' },
  { id: '0662', name: 'push-up' },
  { id: '0334', name: 'dumbbell lateral raise' },
  { id: '0294', name: 'dumbbell biceps curl' },
  { id: '0313', name: 'dumbbell hammer curl' },
  { id: '0241', name: 'cable triceps pushdown (v-bar)' },
  { id: '0585', name: 'lever leg extension' },
  { id: '0739', name: 'sled 45° leg press' },
  { id: '0463', name: 'front plank with twist' },
];
const ex = (id: string) => DEFAULT_EXERCISES.find((e) => e.id === id)!;

describe('ExerciseDB', () => {
  it('empareja ejercicios comunes', () => {
    expect(bestMatch(ex('press-banca'), LIST)?.item.id).toBe('0025');
    expect(bestMatch(ex('press-banca-mancuernas'), LIST)?.item.id).toBe('0289');
    expect(bestMatch(ex('press-inclinado'), LIST)?.item.id).toBe('0047');
    expect(bestMatch(ex('peso-muerto'), LIST)?.item.id).toBe('0032');
    expect(bestMatch(ex('peso-muerto-rumano'), LIST)?.item.id).toBe('0085');
    expect(bestMatch(ex('dominadas'), LIST)?.item.id).toBe('0652');
    expect(bestMatch(ex('flexiones'), LIST)?.item.id).toBe('0662');
    expect(bestMatch(ex('elevaciones-laterales'), LIST)?.item.id).toBe('0334');
    expect(bestMatch(ex('curl-mancuernas'), LIST)?.item.id).toBe('0294');
    expect(bestMatch(ex('extension-cuadriceps'), LIST)?.item.id).toBe('0585');
  });
  it('no fuerza emparejados malos', () => {
    expect(bestMatch(ex('face-pull'), LIST)).toBeNull();
  });
  it('búsqueda y vinculado automático', () => {
    expect(searchExdb(LIST, 'hammer')[0].id).toBe('0313');
    const exs = structuredClone(DEFAULT_EXERCISES).slice(0, 5);
    exs[1].exdbId = 'manual';
    const n = autoLink(exs, LIST);
    expect(n).toBeGreaterThan(0);
    expect(exs[1].exdbId).toBe('manual');
  });
  it('el vínculo sobrevive a la normalización', () => {
    const d = normalizeData({ version: 1, exercises: [{ ...ex('press-banca'), exdbId: '0025' }] });
    expect(d.exercises.find((e) => e.id === 'press-banca')!.exdbId).toBe('0025');
  });
});
