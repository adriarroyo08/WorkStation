import { describe, expect, it } from 'vitest';
import { exerciseScience, parseExerciseScience } from './exercise-science';
import { MOVEMENT_PATTERNS } from './types';
import type { Exercise, ExerciseScience } from './types';
import { emptyData, mergeData, normalizeData } from './data';
import { applyRemote, diff, snapshot } from './sync';
import { exerciseActivation, sessionMuscles } from './muscle-detail';

const valid: ExerciseScience = {
  patron: 'empuje-horizontal',
  musculos: [
    { id: 'pecho-med', rol: 'principal', intensidad: 20 },
    { id: 'triceps', rol: 'estabilizador', intensidad: 90 },
  ],
  evidencia: 'emg',
  fuentes: [{ titulo: 'Fixture sintético', autores: ['Autor de prueba'], año: 2020, doi: '10.1234/fixture' }],
};
const custom: Exercise = { id: 'custom-test', name: 'Prueba', muscle: 'pecho', secondary: ['pecho', 'triceps', 'triceps'], equipment: 'otro', kind: 'reps', custom: true };

describe('contrato científico', () => {
  it('admite todos los patrones y conserva roles independientes de la intensidad', () => {
    for (const patron of MOVEMENT_PATTERNS) expect(parseExerciseScience({ ...valid, patron })).toEqual({ ...valid, patron });
    expect(parseExerciseScience({ ...valid, evidencia: 'hipertrofia', fuentes: [{ titulo: 'Prueba', autores: ['Autor'], año: 2024, url: 'https://example.org/estudio' }] }).evidencia).toBe(
      'hipertrofia',
    );
    expect(parseExerciseScience({ ...valid, evidencia: 'estimada', fuentes: [], musculos: [{ id: 'core', rol: 'secundario', intensidad: 0 }] }).fuentes).toEqual([]);
  });
  it.each([
    null,
    {},
    { ...valid, patron: 'inventado' },
    { ...valid, evidencia: 'probada' },
    ...['desconocido', 'toString', '__proto__', 4].map((id) => ({ ...valid, musculos: [{ id, rol: 'principal', intensidad: 100 }] })),
    ...[-1, 101, NaN, Infinity, '50'].map((intensidad) => ({ ...valid, musculos: [{ id: 'pecho', rol: 'principal', intensidad }] })),
    { ...valid, musculos: [] },
    { ...valid, musculos: [valid.musculos[0], valid.musculos[0]] },
    { ...valid, musculos: [{ id: 'pecho', rol: 'motor', intensidad: 100 }] },
    { ...valid, fuentes: [] },
    { ...valid, evidencia: 'estimada' },
    ...[
      {},
      { titulo: '', autores: ['Autor'], año: 2020, doi: '10.1234/test' },
      { titulo: 'Test', autores: [], año: 2020, doi: '10.1234/test' },
      { titulo: 'Test', autores: [''], año: 2020, doi: '10.1234/test' },
      { titulo: 'Test', autores: ['Autor'], año: 2020.5, doi: '10.1234/test' },
      { titulo: 'Test', autores: ['Autor'], año: 2020 },
      ...['incorrecto', 'https://doi.org/10.1234/test', '10.1234/con espacio'].map((doi) => ({ titulo: 'Test', autores: ['Autor'], año: 2020, doi })),
      ...['no es una URL', 'javascript:alert(1)', 'ftp://example.org', 'https://user:secret@example.org'].map((url) => ({ titulo: 'Test', autores: ['Autor'], año: 2020, url })),
    ].map((fuente) => ({ ...valid, fuentes: [fuente] })),
  ])('rechaza datos inválidos (%j)', (input) => expect(() => parseExerciseScience(input)).toThrow());
  it('mantiene backups y fusión de personalizados antiguos y nuevos', () => {
    const data = { ...emptyData(), exercises: [custom, { ...custom, id: 'custom-science', science: valid }] };
    const restored = normalizeData(JSON.parse(JSON.stringify(data)));
    const synced = applyRemote(emptyData(), diff(snapshot(emptyData()), data)).data;
    expect(synced.exercises.find((e) => e.id === custom.id)).toEqual(custom);
    expect(synced.exercises.find((e) => e.id === 'custom-science')?.science).toEqual(valid);
    expect(restored.exercises.find((e) => e.id === custom.id)).toEqual(custom);
    expect(restored.exercises.find((e) => e.id === 'custom-science')?.science).toEqual(valid);
    expect(mergeData(emptyData(), restored).exercises.find((e) => e.id === 'custom-science')?.science).toEqual(valid);
  });
  it('ofrece fallback estimado sin patrón ni citas y no cambia las activaciones', () => {
    expect(exerciseScience(custom)).toEqual({
      evidencia: 'estimada',
      fuentes: [],
      musculos: [
        { id: 'pecho', rol: 'principal', intensidad: 100 },
        { id: 'triceps', rol: 'secundario', intensidad: 50 },
      ],
    });
    expect(exerciseScience({ ...custom, secondary: undefined }).musculos).toHaveLength(1);
    expect(exerciseScience({ ...custom, science: valid })).toEqual(valid);
    expect(exerciseActivation({ ...custom, science: valid } as Exercise)).toEqual(exerciseActivation(custom));
    expect(sessionMuscles([{ exercise: custom, sets: 2 }])).toEqual(sessionMuscles([{ exercise: { ...custom, science: valid } as Exercise, sets: 2 }]));
  });
});
