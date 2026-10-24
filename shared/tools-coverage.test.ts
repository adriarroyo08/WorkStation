// Recorre todas las herramientas MCP y el cliente de IA con datos de ejemplo.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chat, extractJsonBlock } from './ai';
import { emptyData, findOrCreateExercise, mergeData, routineFromDraft } from './data';
import { callTool, toolJsonSchema, TOOLS, type DataSource } from './mcp-tools';
import type { WorkoutSet, WorkstationData } from './types';

const sets = (n: number, weight: number, reps: number): WorkoutSet[] => Array.from({ length: n }, () => ({ type: 'normal', weight, reps, done: true }));
function sample(): WorkstationData {
  const d = emptyData();
  const now = Date.now();
  const at = (h: number) => new Date(now - h * 3600e3).toISOString();
  d.measurements.push({ id: 'm', date: at(400), bodyweight: 80 });
  d.routines.push({ id: 'r1', name: 'Torso', folderId: 'f', exercises: [{ exerciseId: 'press-banca', restSec: 90, sets: [{ type: 'normal', reps: 8 }] }] });
  d.folders.push({ id: 'f', name: 'Programa' });
  d.workouts.push(
    { id: 'a', name: 'Torso', routineId: 'r1', startedAt: at(200), endedAt: at(199), exercises: [{ exerciseId: 'press-banca', sets: sets(3, 70, 8) }] },
    {
      id: 'b',
      name: 'Torso',
      routineId: 'r1',
      startedAt: at(20),
      endedAt: at(19),
      exercises: [
        { exerciseId: 'press-banca', sets: sets(3, 80, 8) },
        { exerciseId: 'dominadas', sets: sets(3, 0, 10) },
      ],
    },
  );
  return d;
}
const mem = (d: WorkstationData): DataSource => ({ label: 'mem', load: async () => structuredClone(d), save: async (x) => void Object.assign(d, x), env: () => undefined });

describe('cada herramienta MCP responde', () => {
  const reads: [string, Record<string, unknown>, RegExp][] = [
    ['training_summary', {}, /Press de banca/],
    ['list_workouts', { limit: 5 }, /Torso/],
    ['get_workout', { id: 'b' }, /Dominadas/],
    ['exercise_history', { exercise: 'press de banca' }, /80/],
    ['period_report', { period: 'year' }, /Año/],
    ['personal_records', {}, /press-banca|Press de banca/],
    ['achievements', {}, /unlocked|desbloque|title/i],
    ['suggest_next', { exercise: 'press-banca', target_reps: 8 }, /82,5/],
    ['today_plan', {}, /Torso/],
    ['strength_levels', {}, /Intermedio|Novato|Avanzado|Principiante/],
    ['list_exercises', { muscle: 'pecho' }, /Press de banca/],
    ['list_routines', {}, /Torso/],
    ['list_programs', {}, /5×5|PPL/],
  ];
  for (const [name, args, re] of reads)
    it(name, async () => {
      const r = await callTool(mem(sample()), name, args);
      expect(r.isError).toBeFalsy();
      expect(r.text).toMatch(re);
    });

  it('escrituras: rutina, programa, entreno, medida', async () => {
    const d = sample();
    const src = mem(d);
    expect(
      (
        await callTool(src, 'create_routine', {
          name: 'Brazos',
          exercises: [
            { name: 'Curl con barra', sets: 3, reps: 10, superset: 'a' },
            { name: 'Ejercicio inventado', sets: 2, durationSec: 30 },
          ],
        })
      ).text,
    ).toMatch(/creada/);
    expect(d.routines.find((r) => r.name === 'Brazos')?.exercises).toHaveLength(2);
    expect(d.exercises.some((e) => e.name === 'Ejercicio inventado' && e.custom)).toBe(true);
    expect((await callTool(src, 'add_program', { id: 'ppl-6' })).isError).toBeFalsy();
    expect(d.folders.length).toBe(2);
    expect((await callTool(src, 'add_program', { id: 'no-existe' })).text).toMatch(/no|desconocido|existe/i);
    await callTool(src, 'log_workout', { name: 'Libre', duration_min: 45, exercises: [{ name: 'Plancha', sets: [{ durationSec: 60 }] }] });
    expect(d.workouts.at(-1)?.name).toBe('Libre');
    await callTool(src, 'log_measurement', { bodyweight: 79, body_fat: 15 });
    expect(d.measurements.at(-1)).toMatchObject({ bodyweight: 79, bodyFat: 15 });
    expect((await callTool(src, 'import_from_hevy', {})).text).toMatch(/HEVY_API_KEY/);
  });

  it('errores controlados y esquemas JSON', async () => {
    expect((await callTool(mem(sample()), 'no_existe', {})).isError).toBe(true);
    expect((await callTool(mem(sample()), 'get_workout', { id: 'zzz' })).text).toMatch(/no/i);
    for (const t of TOOLS) expect(toolJsonSchema(t)).toHaveProperty('type', 'object');
  });
});

describe('datos', () => {
  it('fusiona sin duplicar y crea ejercicios por nombre', () => {
    const a = sample();
    const b = sample();
    b.workouts.push({ id: 'c', name: 'Nuevo', startedAt: new Date().toISOString(), exercises: [] });
    const m = mergeData(a, b);
    expect(m.workouts.map((w) => w.id).sort()).toEqual(['a', 'b', 'c']);
    const before = a.exercises.length;
    expect(findOrCreateExercise(a, 'press de banca (barra)').id).toBe('press-banca');
    expect(findOrCreateExercise(a, 'Remo Zercher').custom).toBe(true);
    expect(a.exercises.length).toBe(before + 1);
    const r = routineFromDraft(a, { name: 'X', exercises: [{ name: 'Sentadilla (barra)', sets: 2, reps: 5, weight: 100 }] });
    expect(r.exercises[0]).toMatchObject({
      exerciseId: 'sentadilla',
      sets: [
        { reps: 5, weight: 100 },
        { reps: 5, weight: 100 },
      ],
    });
  });
});

describe('cliente de IA', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('llama a chat/completions y propaga errores', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'hola' } }] })));
    vi.stubGlobal('fetch', f);
    expect(await chat({ providerId: 'x', baseUrl: 'https://api.test/v1/', model: 'm', apiKey: 'k' }, [{ role: 'user', content: 'hi' }])).toBe('hola');
    expect(f).toHaveBeenCalledWith('https://api.test/v1/chat/completions', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer k' }) }));
    vi.stubGlobal('fetch', async () => new Response('límite', { status: 429 }));
    await expect(chat({ providerId: 'x', baseUrl: 'https://api.test', model: 'm', apiKey: '' }, [])).rejects.toThrow(/429/);
    await expect(chat({ providerId: 'x', baseUrl: '', model: '', apiKey: '' }, [])).rejects.toThrow(/Configura/);
    expect(extractJsonBlock('texto ```json\n{"a":1}\n``` fin')).toEqual({ a: 1 });
    expect(extractJsonBlock('```json\n{roto\n```')).toBeUndefined();
  });
});
