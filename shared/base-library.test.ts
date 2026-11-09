import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_EXERCISES } from './exercises';
import { emptyData, normalizeData, workoutFromRoutine } from './data';
import { catalogExtras } from './catalog';
import type { Routine } from './types';

const added = DEFAULT_EXERCISES.slice(-30);
const catalog = JSON.parse(readFileSync('app/public/catalog.json', 'utf8')) as { id: string; category: string }[];

describe('ampliación de la biblioteca base (#180)', () => {
  it('añade 30 ejercicios únicos y alcanza los mínimos por músculo principal', () => {
    expect(DEFAULT_EXERCISES).toHaveLength(164);
    expect(new Set(DEFAULT_EXERCISES.map((e) => e.id)).size).toBe(DEFAULT_EXERCISES.length);
    expect(new Set(DEFAULT_EXERCISES.map((e) => e.name)).size).toBe(DEFAULT_EXERCISES.length);
    const minima = { cuello: 4, abductores: 4, aductores: 4, lumbar: 5, trapecio: 5, antebrazo: 6, gemelos: 7, gluteos: 9, isquios: 9 };
    for (const [muscle, count] of Object.entries(minima)) expect(DEFAULT_EXERCISES.filter((e) => e.muscle === muscle).length, muscle).toBeGreaterThanOrEqual(count);
  });
  it('usa imágenes reales de fuerza, sin repetir las de la biblioteca anterior, y evidencia estimada sin citas', () => {
    const previousMedia = new Set(
      DEFAULT_EXERCISES.slice(0, -30)
        .map((e) => e.media)
        .filter(Boolean),
    );
    const media = added.flatMap((e) => (e.media ? [e.media] : []));
    expect(new Set(media).size).toBe(media.length);
    for (const e of added) {
      if (e.media) {
        expect(previousMedia.has(e.media)).toBe(false);
        expect(catalog.find((c) => c.id === e.media)?.category, e.id).toBe('fuerza');
      }
      expect(e.science?.evidencia).toBe('estimada');
      expect(e.science?.fuentes).toEqual([]);
    }
  });
  it.each(added.filter((e) => e.media))('conserva la identidad importada de $id, sus datos y sus referencias', (exercise) => {
    const data = emptyData();
    const imported = {
      ...structuredClone(exercise),
      id: `db-${exercise.media}`,
      custom: true,
      name: 'Nombre antiguo',
      stickyNote: 'Mi nota',
      instructions: ['Mi instrucción'],
      exdbId: 'gif-guardado',
    };
    data.exercises = [imported];
    const routine: Routine = { id: 'routine', name: 'Rutina', exercises: [{ exerciseId: imported.id, restSec: 90, sets: [{ type: 'normal', weight: 10, reps: 8 }] }] };
    data.routines = [routine];
    data.workouts = [workoutFromRoutine(routine)];
    data.workouts[0].exercises[0].sets[0].done = true;
    const before = structuredClone(data);
    const normalized = normalizeData(data);
    expect(normalized.exercises.filter((e) => e.media === exercise.media)).toHaveLength(1);
    expect(normalized.exercises.find((e) => e.id === imported.id)).toEqual(imported);
    expect(normalized.routines).toEqual(data.routines);
    expect(normalized.workouts).toEqual(data.workouts);
    expect(catalogExtras(normalized.exercises, catalog).some((c) => c.id === exercise.media)).toBe(false);
    expect(normalizeData(normalized)).toEqual(normalized);
    expect(data).toEqual(before);
  });
  it('no confunde un ejercicio propio con una importación del catálogo', () => {
    const data = emptyData();
    const exercise = added.find((e) => e.media)!;
    data.exercises = [{ ...exercise, id: 'personalizado', custom: true }];
    expect(normalizeData(data).exercises.some((e) => e.id === exercise.id)).toBe(true);
  });
});
