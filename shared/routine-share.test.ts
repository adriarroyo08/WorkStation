import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { decodeRoutine, encodeRoutine, importSharedRoutine } from './routine-share';
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
