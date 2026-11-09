import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { handleMcp } from './mcp-http';
import { callTool, TOOLS, type DataSource } from './mcp-tools';
import { applyRoutinePatch, findRoutine } from './routine-edit';
import type { WorkstationData } from './types';

function sample(): WorkstationData {
  const d = emptyData();
  d.routines.push(
    {
      id: 'r1',
      name: 'Torso A',
      notes: 'Lunes',
      exercises: [
        {
          exerciseId: 'press-banca',
          restSec: 120,
          sets: [
            { type: 'warmup', reps: 10, weight: 40 },
            { type: 'normal', reps: 8, weight: 80 },
            { type: 'normal', reps: 8, weight: 80 },
          ],
        },
        { exerciseId: 'dominadas', restSec: 90, sets: [{ type: 'normal', reps: 10 }] },
      ],
    },
    { id: 'r2', name: 'Torso B', exercises: [{ exerciseId: 'dominadas', restSec: 90, sets: [{ type: 'normal', reps: 6 }] }] },
    { id: 'r3', name: 'Pierna', exercises: [{ exerciseId: 'sentadilla', restSec: 180, sets: [{ type: 'normal', reps: 5, weight: 100 }] }] },
  );
  return d;
}
const mem = (d: WorkstationData): DataSource => ({ label: 'mem', load: async () => structuredClone(d), save: async (x) => void Object.assign(d, x) });

describe('localizar rutinas', () => {
  it('por id, por nombre exacto sin tildes ni mayúsculas y por parte única del nombre', () => {
    const d = sample();
    expect(findRoutine(d, 'r2').name).toBe('Torso B');
    expect(findRoutine(d, 'torso a').id).toBe('r1');
    expect(findRoutine(d, 'piern').id).toBe('r3');
  });
  it('ambigua o inexistente: error con las rutinas que hay', () => {
    const d = sample();
    expect(() => findRoutine(d, 'torso')).toThrow(/varias rutinas.*Torso A.*Torso B/);
    expect(() => findRoutine(d, 'brazo')).toThrow(/no encontrada.*Pierna/);
    expect(() => findRoutine(d, 'piern', true)).toThrow(/nombre exacto/);
  });
});

describe('update_routine', () => {
  it('cambia el descanso de un ejercicio y deja el resto igual', async () => {
    const d = sample();
    const before = structuredClone(d);
    const r = await callTool(mem(d), 'update_routine', { routine: 'Torso A', changes: [{ exercise: 'press de banca', restSec: 150 }] });
    expect(r.isError).toBeFalsy();
    expect(r.text).toMatch(/actualizada/);
    expect(r.text).toContain('"restSec": 150');
    expect(d.routines[0].exercises[0].restSec).toBe(150);
    expect({ ...d.routines[0], exercises: [{ ...d.routines[0].exercises[0], restSec: 120 }, d.routines[0].exercises[1]] }).toEqual(before.routines[0]);
    expect(d.routines.slice(1)).toEqual(before.routines.slice(1));
  });

  it('renombra, ajusta series, reps y peso sin tocar el calentamiento', () => {
    const d = sample();
    const r = d.routines[0];
    applyRoutinePatch(d, r, { name: 'Empuje', notes: '', changes: [{ position: 1, sets: 4, reps: 6, weight: 85 }] });
    expect(r.name).toBe('Empuje');
    expect(r.notes).toBeUndefined();
    expect(r.exercises[0].sets).toEqual([
      { type: 'warmup', reps: 10, weight: 40 },
      { type: 'normal', reps: 6, weight: 85 },
      { type: 'normal', reps: 6, weight: 85 },
      { type: 'normal', reps: 6, weight: 85 },
    ]);
    applyRoutinePatch(d, r, { changes: [{ exercise: 'press-banca', sets: 2 }] });
    expect(r.exercises[0].sets.map((s) => s.type)).toEqual(['warmup', 'normal']);
  });

  it('mueve, sustituye, quita y añade ejercicios en orden', () => {
    const d = sample();
    const r = d.routines[0];
    const done = applyRoutinePatch(d, r, {
      changes: [
        { exercise: 'dominadas', move_to: 1 },
        { position: 2, replace_with: 'Press inclinado con mancuernas', notes: 'Banco a 30°' },
      ],
      add: [{ name: 'Fondos', sets: 2, reps: 12, position: 1 }],
    });
    expect(r.exercises.map((e) => e.exerciseId)).toEqual([expect.stringMatching(/fondos/), 'dominadas', expect.any(String)]);
    expect(r.exercises[2]).toMatchObject({ notes: 'Banco a 30°', restSec: 120 });
    expect(r.exercises[2].sets).toHaveLength(3);
    expect(r.exercises[0]).toMatchObject({ restSec: d.settings.defaultRestSec, sets: [{ reps: 12 }, { reps: 12 }] });
    expect(done.join(' ')).toMatch(/añadido/);
    applyRoutinePatch(d, r, { changes: [{ exercise: 'fondos', remove: true }] });
    expect(r.exercises).toHaveLength(2);
  });

  it('errores: ejercicio que no está, rutina vacía y ningún cambio', async () => {
    const d = sample();
    const before = structuredClone(d);
    expect((await callTool(mem(d), 'update_routine', { routine: 'r1', changes: [{ exercise: 'curl' }] })).text).toMatch(/no está en la rutina.*1\. Press de banca/);
    expect((await callTool(mem(d), 'update_routine', { routine: 'r3', changes: [{ position: 1, remove: true }] })).text).toMatch(/delete_routine/);
    expect((await callTool(mem(d), 'update_routine', { routine: 'r3' })).isError).toBe(true);
    expect((await callTool(mem(d), 'update_routine', { routine: 'r3', changes: [{ position: 1, restSec: -5 }] })).text).toMatch(/no válidos/);
    expect(d).toEqual(before);
  });
});

describe('delete_routine', () => {
  it('borra solo por id o nombre exacto y devuelve lo borrado', async () => {
    const d = sample();
    expect((await callTool(mem(d), 'delete_routine', { routine: 'piern' })).isError).toBe(true);
    const r = await callTool(mem(d), 'delete_routine', { routine: 'Pierna' });
    expect(r.text).toMatch(/borrada \(id r3\)[\s\S]*Sentadilla/);
    expect(d.routines.map((x) => x.id)).toEqual(['r1', 'r2']);
  });
});

describe('pistas MCP', () => {
  it('tools/list marca las escrituras que cambian o borran datos', async () => {
    const src = mem(sample());
    const res = await handleMcp(
      new Request('https://fn/mcp', { method: 'POST', headers: { authorization: 'Bearer ws_ok' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }),
      () => ({ ...src, verifyKey: async () => true }),
    );
    const tools: { name: string; annotations: Record<string, boolean> }[] = (await res.json()).result.tools;
    const ann = (n: string) => tools.find((t) => t.name === n)?.annotations;
    expect(ann('list_routines')).toEqual({ readOnlyHint: true });
    expect(ann('create_routine')).toEqual({ readOnlyHint: false, destructiveHint: false });
    expect(ann('update_routine')).toEqual({ readOnlyHint: false, destructiveHint: true });
    expect(ann('delete_routine')).toEqual({ readOnlyHint: false, destructiveHint: true });
    expect(tools).toHaveLength(TOOLS.length);
  });
});
