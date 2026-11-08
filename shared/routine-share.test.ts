import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { decodeRoutine, encodeRoutine, importSharedRoutine, MAX_SHARED_CODE_CHARS, MAX_SHARED_JSON_BYTES } from './routine-share';
import type { Routine } from './types';

const routine = (): Routine => ({
  id: 'r',
  name: 'Torso A',
  notes: 'Sube peso cada semana',
  exercises: [
    {
      exerciseId: 'press-banca',
      restSec: 120,
      supersetId: 'x1',
      sets: [
        { type: 'warmup', reps: 10, weight: 40 },
        { type: 'normal', reps: 8, weight: 80 },
      ],
    },
    { exerciseId: 'remo-barra', restSec: 120, supersetId: 'x1', sets: [{ type: 'normal', reps: 10 }] },
    { exerciseId: 'custom-mi-ejercicio', restSec: 60, sets: [{ type: 'normal', durationSec: 45 }] },
  ],
});

describe('compartir rutina por enlace', () => {
  it('ida y vuelta, con compresión y con ejercicio personalizado', async () => {
    const from = emptyData();
    from.exercises.push({ id: 'custom-mi-ejercicio', name: 'Mi ejercicio', muscle: 'core', equipment: 'ninguno', kind: 'duration', custom: true });
    const code = await encodeRoutine(routine(), from.exercises);
    expect(code[0]).toBe('z');
    expect(code).toMatch(/^[\w-]+$/); // seguro para URL
    const s = await decodeRoutine(code);
    expect(s).toMatchObject({ name: 'Torso A', notes: 'Sube peso cada semana' });
    expect(s.exercises.map((e) => e.name)).toEqual(['Press de banca (barra)', 'Remo con barra', 'Mi ejercicio']);
    expect(s.exercises[0].sets[0]).toEqual({ type: 'warmup', reps: 10, weight: 40, durationSec: undefined });

    const to = emptyData();
    const r = importSharedRoutine(to, s);
    expect(to.routines).toHaveLength(1);
    expect(r.exercises[0].supersetId).toBeDefined();
    expect(r.exercises[0].supersetId).toBe(r.exercises[1].supersetId);
    expect(r.exercises[2].supersetId).toBeUndefined();
    expect(to.exercises.find((e) => e.id === r.exercises[2].exerciseId)).toMatchObject({ name: 'Mi ejercicio', kind: 'duration', custom: true });
    // Importar otra vez no duplica el ejercicio personalizado.
    importSharedRoutine(to, s);
    expect(to.exercises.filter((e) => e.name === 'Mi ejercicio')).toHaveLength(1);
  });
  it('rechaza enlaces dañados o manipulados', async () => {
    await expect(decodeRoutine('zabc')).rejects.toThrow(/dañado/);
    const evil = 'j' + btoa(JSON.stringify({ v: 1, n: 'x', e: [] })).replace(/=+$/, '');
    await expect(decodeRoutine(evil)).rejects.toThrow(/válida/);
    const big = 'j' + btoa(JSON.stringify({ v: 1, n: 'x', e: [['press-banca', -5, null, [[9, 1e9, -3, 'x']]]] })).replace(/=+$/, '');
    const s = await decodeRoutine(big);
    const weird = 'j' + btoa(JSON.stringify({ v: 1, n: 'x', e: [['custom-z', 60, null, []]], c: { 'custom-z': ['Z', 'alas', 'x', 'magia'] } })).replace(/=+$/, '');
    expect((await decodeRoutine(weird)).custom[0]).toMatchObject({ muscle: 'otro', kind: 'weight_reps' });
    expect(s.exercises[0]).toMatchObject({ restSec: 90, sets: [{ type: 'normal', reps: undefined, weight: undefined }] });
  });
});

const rawLink = (sets: unknown[], id = 'press-banca') => 'j' + btoa(JSON.stringify({ v: 1, n: 'Antigua', e: [[id, 90, null, sets]] })).replace(/=+$/, '');

it('conserva un enlace antiguo fijo y el payload sin rangos', async () => {
  const old = 'jeyJ2IjoxLCJuIjoiQW50aWd1YSIsImUiOltbInByZXNzLWJhbmNhIiw5MCxudWxsLFtbMSwxMiw4MCxudWxsXV1dXX0';
  const decoded = await decodeRoutine(old);
  expect(decoded.exercises[0].sets[0]).toMatchObject({ reps: 12, weight: 80 });
  const data = emptyData();
  const imported = importSharedRoutine(data, decoded);
  // El decodificador acepta el fixture fijo y la codificación sin compresión conserva sus bytes.
  const { vi } = await import('vitest');
  vi.stubGlobal('CompressionStream', undefined);
  try {
    expect(await encodeRoutine(imported, data.exercises)).toBe(old);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('comparte e importa rangos mezclados con series fijas', async () => {
  const data = emptyData();
  const r = routine();
  r.exercises[0].sets[1] = { type: 'normal', reps: 12, repsMin: 8, weight: 80 };
  const decoded = await decodeRoutine(await encodeRoutine(r, data.exercises));
  expect(decoded.exercises[0].sets[1]).toMatchObject({ reps: 12, repsMin: 8 });
  expect(decoded.exercises[0].sets[0]).not.toHaveProperty('repsMin');
  expect(importSharedRoutine(data, decoded).exercises[0].sets[1].repsMin).toBe(8);
});

it.each([13, 12, '8', -1, 0, 8.5, 101, null])('descarta el suelo manipulado %s sin error', async (min) => {
  const decoded = await decodeRoutine(rawLink([[1, 12, 80, null, min]]));
  expect(decoded.exercises[0].sets[0]).not.toHaveProperty('repsMin');
  expect(decoded.exercises[0].sets[0].reps).toBe(12);
});

const link = (payload: unknown) => 'j' + btoa(JSON.stringify(payload)).replace(/=+$/, '');

describe('enlaces manipulados (auditoría de seguridad)', () => {
  it.each(['__proto__', 'constructor', 'toString', ['otro']])('no acepta %s como músculo ni como tipo', async (bad) => {
    const s = await decodeRoutine(link({ v: 1, n: 'x', e: [['custom-z', 60, null, []]], c: { 'custom-z': ['Z', bad, 'x', bad] } }));
    expect(s.custom[0]).toMatchObject({ muscle: 'otro', kind: 'weight_reps' });
  });
  it('un tipo de serie no entero cae a normal', async () => {
    const s = await decodeRoutine(rawLink([[0.5, 10, null, null]]));
    expect(s.exercises[0].sets[0].type).toBe('normal');
  });
  it('rechaza con mensaje legible las estructuras que no son listas', async () => {
    await expect(decodeRoutine(link({ v: 1, n: 'x', e: [5] }))).rejects.toThrow(/válida/);
    const s = await decodeRoutine(link({ v: 1, n: 'x', e: [['press-banca', 60, null, [7, [1, 8, 50, null]]]], c: { a: 5 } }));
    expect(s.exercises[0].sets).toHaveLength(1);
    expect(s.custom).toEqual([]);
  });
  it('corta los enlaces enormes y las bombas de compresión', async () => {
    await expect(decodeRoutine('j' + 'a'.repeat(MAX_SHARED_CODE_CHARS))).rejects.toThrow(/dañado/);
    const zeros = new Blob([new Uint8Array(MAX_SHARED_JSON_BYTES * 3)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(zeros).arrayBuffer());
    const code =
      'z' +
      btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    expect(code.length).toBeLessThan(MAX_SHARED_CODE_CHARS);
    await expect(decodeRoutine(code)).rejects.toThrow(/dañado/);
  });
});

it('descarta rangos en ejercicios de duración', async () => {
  const data = emptyData();
  const timed = data.exercises.find((e) => e.kind === 'duration')!;
  expect((await decodeRoutine(rawLink([[1, 12, null, 30, 8]], timed.id))).exercises[0].sets[0]).not.toHaveProperty('repsMin');
});
