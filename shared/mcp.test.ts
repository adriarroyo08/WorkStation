import { describe, expect, it } from 'vitest';
import { cloudSource } from './cloud-source';
import { handleMcp } from './mcp-http';
import { callTool, TOOLS, type DataSource } from './mcp-tools';
import { emptyData } from './data';
import type { WorkstationData } from './types';

// Supabase simulado: las funciones RPC api_records / api_upsert sobre una tabla en memoria.
function fakeSupabase(validKey = 'ws_ok', writable = true) {
  const rows = new Map<string, Record<string, unknown>>();
  const calls: string[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const fn = url.split('/rpc/')[1];
    calls.push(fn);
    const body = JSON.parse(String(init.body));
    if (body.p_key !== validKey) return new Response(JSON.stringify({ message: 'API key no válida' }), { status: 400 });
    if (fn === 'api_records') return new Response(JSON.stringify([...rows.values()]));
    if (fn === 'api_upsert') {
      if (!writable) return new Response(JSON.stringify({ message: 'Esta API key es de solo lectura' }), { status: 400 });
      for (const r of body.p_rows) rows.set(`${r.collection}:${r.id}`, { ...r, updated_at: new Date().toISOString() });
      return new Response(JSON.stringify(body.p_rows.length));
    }
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;
  return { f, rows, calls };
}

const memSource = (d: WorkstationData): DataSource => ({ label: 'mem', load: async () => structuredClone(d), save: async (x) => void Object.assign(d, x) });

describe('herramientas MCP', () => {
  it('todas tienen descripción y esquema', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(16);
    for (const t of TOOLS) expect(t.description.length).toBeGreaterThan(10);
  });
  it('valida argumentos', async () => {
    const r = await callTool(memSource(emptyData()), 'period_report', { period: 'decade' });
    expect(r.isError).toBe(true);
  });
  it('registra y lee un entreno', async () => {
    const d = emptyData();
    const src = memSource(d);
    await callTool(src, 'log_workout', { name: 'Pierna', exercises: [{ name: 'Sentadilla (barra)', sets: [{ weight: 100, reps: 5 }] }] });
    const r = await callTool(src, 'list_workouts', {});
    expect(r.text).toContain('Pierna');
  });
});

describe('origen nube con API key', () => {
  it('escribe solo los cambios y lee lo escrito', async () => {
    const sb = fakeSupabase();
    const src = cloudSource({ url: 'https://x.supabase.co', anonKey: 'anon', apiKey: 'ws_ok', fetch: sb.f });
    await callTool(src, 'log_measurement', { bodyweight: 80 });
    expect([...sb.rows.keys()]).toEqual([expect.stringMatching(/^measurements:/)]);
    const r = await callTool(cloudSource({ url: 'https://x.supabase.co', anonKey: 'anon', apiKey: 'ws_ok', fetch: sb.f }), 'training_summary', {});
    expect(r.text).toContain('80 kg');
  });
  it('rechaza keys inválidas y de solo lectura', async () => {
    const sb = fakeSupabase('ws_ok', false);
    const bad = await callTool(cloudSource({ url: 'u', anonKey: 'a', apiKey: 'ws_mal', fetch: sb.f }), 'training_summary', {});
    expect(bad).toMatchObject({ isError: true, text: expect.stringContaining('no válida') });
    const ro = await callTool(cloudSource({ url: 'u', anonKey: 'a', apiKey: 'ws_ok', fetch: sb.f }), 'log_measurement', { bodyweight: 70 });
    expect(ro).toMatchObject({ isError: true, text: expect.stringContaining('solo lectura') });
  });
});

describe('MCP por HTTP', () => {
  const sb = fakeSupabase();
  const handler = (req: Request) => handleMcp(req, (key) => cloudSource({ url: 'https://x.supabase.co', anonKey: 'anon', apiKey: key, fetch: sb.f }));
  const post = (body: unknown, auth = 'Bearer ws_ok', url = 'https://fn/mcp') =>
    handler(new Request(url, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body) }));

  it('initialize, tools/list y tools/call', async () => {
    const init = await (await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })).json();
    expect(init.result.serverInfo.name).toBe('workstation');
    expect((await post({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    const list = await (await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    expect(list.result.tools.find((t: { name: string }) => t.name === 'log_workout').inputSchema.type).toBe('object');
    const call = await (await post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'personal_records', arguments: {} } })).json();
    expect(call.result.isError).toBe(false);
  });
  it('key en la URL y sin key', async () => {
    const r = await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, '', 'https://fn/mcp?key=ws_ok');
    expect((await r.json()).result).toEqual({});
    expect((await handler(new Request('https://fn/mcp', { method: 'POST', body: '{}' }))).status).toBe(401);
  });
});

describe('auditoría del servidor MCP remoto', () => {
  it('pagina la lectura y rechaza peticiones JSON-RPC rotas', async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({
      collection: 'workouts',
      id: `w${i}`,
      doc: { id: `w${i}`, name: `E${i}`, startedAt: '2026-10-01T10:00:00Z', exercises: [] },
      deleted: false,
      client_updated_at: '2026-10-01T10:00:00Z',
      updated_at: `2026-10-01T10:00:00.${String(i).padStart(6, '0')}+00:00`,
    }));
    const calls: unknown[] = [];
    const f = (async (_url: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      calls.push(b.p_since ?? null);
      const from = b.p_since ? rows.findIndex((r) => r.updated_at === b.p_since) + 1 : 0;
      return new Response(JSON.stringify(rows.slice(from, from + 1000)));
    }) as unknown as typeof fetch;
    const data = await cloudSource({ url: 'u', anonKey: 'a', apiKey: 'ws_ok', fetch: f }).load();
    expect(data.workouts).toHaveLength(1500);
    expect(calls).toEqual([null, rows[999].updated_at]);

    const src = { label: 'x', load: async () => emptyData(), save: async () => {} };
    const post = (body: string) => handleMcp(new Request('http://x/mcp', { method: 'POST', headers: { authorization: 'Bearer ws_ok' }, body }), () => src);
    expect((await post('null')).status).toBe(400);
    const batch = await (await post('[null, {"jsonrpc":"2.0","id":1,"method":"ping"}]')).json();
    expect(batch).toHaveLength(2);
    expect(batch[0].error.code).toBe(-32600);
  });
});

describe('flujo completo de entrenador (consultar → crear rutina → registrar → volver a consultar)', () => {
  it('ejecuta el ciclo interactivo de entrenador con datos sintéticos y verifica coherencia de unidades en kg', async () => {
    const d = emptyData();
    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 86400e3).toISOString();
    d.measurements.push({ id: 'm-1', date: daysAgo(5), bodyweight: 78 });
    d.workouts.push({
      id: 'w-prev',
      name: 'Torso A',
      startedAt: daysAgo(4),
      endedAt: daysAgo(4),
      exercises: [
        {
          exerciseId: 'press-banca',
          sets: [
            { type: 'normal', weight: 80, reps: 6, done: true },
            { type: 'normal', weight: 80, reps: 6, done: true },
          ],
        },
      ],
    });

    const src = memSource(d);

    // 1. Consultar estado del cliente
    // 1.1 training_summary
    const summaryBefore = await callTool(src, 'training_summary', {});
    expect(summaryBefore.isError).toBeFalsy();
    expect(summaryBefore.text).toContain('78 kg');
    expect(summaryBefore.text).toContain('Press de banca');

    // 1.2 today_plan (reconoce today_plan y recuperación muscular)
    const todayPlanBefore = await callTool(src, 'today_plan', {});
    expect(todayPlanBefore.isError).toBeFalsy();
    const planBeforeParsed = JSON.parse(todayPlanBefore.text);
    // Como la sesión fue hace 4 días (>72h), no debe haber fatiga muscular residual
    expect(planBeforeParsed.recovery).toEqual([]);

    // 1.3 list_exercises (filtro pecho)
    const exercisesPecho = await callTool(src, 'list_exercises', { muscle: 'pecho' });
    expect(exercisesPecho.isError).toBeFalsy();
    expect(exercisesPecho.text).toContain('Press de banca');

    // 1.4 suggest_next (sobrecarga progresiva)
    const suggestion = await callTool(src, 'suggest_next', { exercise: 'press-banca', target_reps: 6 });
    expect(suggestion.isError).toBeFalsy();
    expect(suggestion.text).toContain('82,5'); // Sugiere subir a 82.5 kg

    // 1.5 list_routines inicial
    const routinesBefore = await callTool(src, 'list_routines', {});
    expect(routinesBefore.isError).toBeFalsy();
    expect(JSON.parse(routinesBefore.text)).toEqual([]);

    // 2. Crear rutina personalizada
    const createRes = await callTool(src, 'create_routine', {
      name: 'Fuerza Torso Avanzado',
      notes: 'Bloque de intensificación',
      exercises: [
        { name: 'Press de banca (barra)', sets: 4, reps: 6, weight: 82.5, restSec: 120 },
        { name: 'Remo con barra', sets: 4, reps: 8, weight: 70, restSec: 90 },
      ],
    });
    expect(createRes.isError).toBeFalsy();
    expect(createRes.text).toMatch(/Rutina "Fuerza Torso Avanzado" creada/);

    // 3. Registrar entreno completado y nueva medición corporal
    const logRes = await callTool(src, 'log_workout', {
      name: 'Fuerza Torso Avanzado',
      date: new Date(Date.now() - 3600e3 * 2).toISOString(), // Hace 2 horas
      duration_min: 55,
      notes: 'Sesión completada con éxito. Cargas superadas.',
      exercises: [
        {
          name: 'Press de banca (barra)',
          sets: [
            { type: 'warmup', weight: 60, reps: 8 },
            { type: 'normal', weight: 82.5, reps: 6 },
            { type: 'normal', weight: 82.5, reps: 6 },
            { type: 'normal', weight: 85, reps: 5, rpe: 9.5 },
          ],
        },
        {
          name: 'Remo con barra',
          sets: [
            { type: 'normal', weight: 70, reps: 8 },
            { type: 'normal', weight: 70, reps: 8 },
            { type: 'normal', weight: 72.5, reps: 7 },
          ],
        },
      ],
    });
    expect(logRes.isError).toBeFalsy();
    expect(logRes.text).toMatch(/Entrenamiento registrado \(id \w+, volumen \d+ kg\)/);

    // Registrar pesaje
    const measRes = await callTool(src, 'log_measurement', { bodyweight: 79.2, body_fat: 14.2 });
    expect(measRes.isError).toBeFalsy();
    expect(measRes.text).toContain('Medición guardada');

    // 4. Volver a consultar para verificar la actualización integral del estado
    // 4.1 list_routines: contiene la rutina creada
    const routinesAfter = await callTool(src, 'list_routines', {});
    const parsedRoutines = JSON.parse(routinesAfter.text);
    expect(parsedRoutines).toHaveLength(1);
    expect(parsedRoutines[0].name).toBe('Fuerza Torso Avanzado');
    expect(parsedRoutines[0].exercises).toHaveLength(2);
    expect(parsedRoutines[0].exercises[0].weight).toBe(82.5);

    // 4.2 list_workouts: contiene el nuevo entrenamiento con volumen en kg
    const workoutsAfter = await callTool(src, 'list_workouts', { limit: 1 });
    const parsedWorkouts = JSON.parse(workoutsAfter.text);
    expect(parsedWorkouts).toHaveLength(1);
    expect(parsedWorkouts[0].name).toBe('Fuerza Torso Avanzado');
    expect(parsedWorkouts[0].minutes).toBe(55);
    expect(parsedWorkouts[0].volume_kg).toBeGreaterThan(0);
    const newWorkoutId = parsedWorkouts[0].id;

    // 4.3 get_workout: detalle completo de series y pesos en kg
    const workoutDetail = await callTool(src, 'get_workout', { id: newWorkoutId });
    expect(workoutDetail.isError).toBeFalsy();
    expect(workoutDetail.text).toContain('85kg × 5');
    expect(workoutDetail.text).toContain('(calent.)');

    // 4.4 exercise_history: progresión actualizada para press de banca con 85 kg
    const hist = await callTool(src, 'exercise_history', { exercise: 'Press de banca' });
    expect(hist.isError).toBeFalsy();
    const histParsed = JSON.parse(hist.text);
    expect(histParsed.sessions).toHaveLength(2);
    expect(histParsed.sessions.at(-1).best_weight).toBe(85);

    // 4.5 personal_records: comprueba nuevo récord personal
    const prs = await callTool(src, 'personal_records', {});
    expect(prs.isError).toBeFalsy();
    expect(prs.text).toContain('press-banca');

    // 4.6 today_plan: reconoce la fatiga acumulada en pecho y espalda (< 72h)
    const todayPlanAfter = await callTool(src, 'today_plan', {});
    expect(todayPlanAfter.isError).toBeFalsy();
    const planAfterParsed = JSON.parse(todayPlanAfter.text);
    const fatiguedMuscles = planAfterParsed.recovery.map((r: { muscle: string }) => r.muscle);
    expect(fatiguedMuscles).toContain('pecho');
    expect(fatiguedMuscles).toContain('espalda');

    // 4.7 training_summary: muestra la nueva medición y último entreno
    const summaryAfter = await callTool(src, 'training_summary', {});
    expect(summaryAfter.text).toContain('79.2 kg');
    expect(summaryAfter.text).toContain('Fuerza Torso Avanzado');
  });
});

describe('rechazo riguroso de escritura en modo read-only', () => {
  it('comprueba que las herramientas de mutación declaran write: true y las de consulta no', () => {
    const writeTools = TOOLS.filter((t) => t.write).map((t) => t.name).sort();
    expect(writeTools).toEqual(['add_program', 'create_routine', 'import_from_hevy', 'log_measurement', 'log_workout']);

    const readTools = TOOLS.filter((t) => !t.write).map((t) => t.name);
    expect(readTools).toContain('training_summary');
    expect(readTools).toContain('today_plan');
    expect(readTools).toContain('list_workouts');
    expect(readTools).toContain('get_workout');
    expect(readTools).toContain('exercise_history');
    expect(readTools).toContain('period_report');
    expect(readTools).toContain('personal_records');
    expect(readTools).toContain('achievements');
    expect(readTools).toContain('suggest_next');
    expect(readTools).toContain('strength_levels');
    expect(readTools).toContain('list_exercises');
    expect(readTools).toContain('list_routines');
    expect(readTools).toContain('list_programs');
  });

  it('rechaza todas las herramientas de escritura cuando la API key es de solo lectura', async () => {
    const sb = fakeSupabase('ws_readonly', false);
    const src = cloudSource({ url: 'https://x.supabase.co', anonKey: 'anon', apiKey: 'ws_readonly', fetch: sb.f });

    // Lecturas permitidas
    const readRes = await callTool(src, 'training_summary', {});
    expect(readRes.isError).toBeFalsy();

    // Escrituras rechazadas
    const w1 = await callTool(src, 'create_routine', { name: 'Test', exercises: [{ name: 'Dominadas', sets: 3 }] });
    expect(w1.isError).toBe(true);
    expect(w1.text).toContain('solo lectura');

    const w2 = await callTool(src, 'log_workout', { name: 'Test', exercises: [{ name: 'Dominadas', sets: [{ reps: 5 }] }] });
    expect(w2.isError).toBe(true);
    expect(w2.text).toContain('solo lectura');

    const w3 = await callTool(src, 'log_measurement', { bodyweight: 75 });
    expect(w3.isError).toBe(true);
    expect(w3.text).toContain('solo lectura');

    const w4 = await callTool(src, 'add_program', { id: 'ppl-6' });
    expect(w4.isError).toBe(true);
    expect(w4.text).toContain('solo lectura');
  });

  it('expone anotaciones readOnlyHint en HTTP MCP y devuelve error RPC en escrituras con key de solo lectura', async () => {
    const sb = fakeSupabase('ws_readonly', false);
    const handler = (req: Request) => handleMcp(req, (key) => cloudSource({ url: 'https://x.supabase.co', anonKey: 'anon', apiKey: key, fetch: sb.f }));
    const post = (body: unknown) =>
      handler(new Request('https://fn/mcp', { method: 'POST', headers: { authorization: 'Bearer ws_readonly', 'content-type': 'application/json' }, body: JSON.stringify(body) }));

    // tools/list expone readOnlyHint
    const listRes = await (await post({ jsonrpc: '2.0', id: 10, method: 'tools/list' })).json();
    const tools = listRes.result.tools;
    const readOnlyTools = tools.filter((t: { annotations: { readOnlyHint: boolean } }) => t.annotations.readOnlyHint);
    const writeableTools = tools.filter((t: { annotations: { readOnlyHint: boolean } }) => !t.annotations.readOnlyHint);

    expect(readOnlyTools.map((t: { name: string }) => t.name)).toContain('today_plan');
    expect(readOnlyTools.map((t: { name: string }) => t.name)).toContain('training_summary');
    expect(writeableTools.map((t: { name: string }) => t.name).sort()).toEqual(['add_program', 'create_routine', 'import_from_hevy', 'log_measurement', 'log_workout']);

    // tools/call de log_workout con key readonly falla con isError: true
    const callRes = await (await post({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'log_workout',
        arguments: { name: 'Prueba', exercises: [{ name: 'Dominadas', sets: [{ reps: 5 }] }] },
      },
    })).json();

    expect(callRes.result.isError).toBe(true);
    expect(callRes.result.content[0].text).toContain('solo lectura');
  });
});

describe('coherencia local/remoto y pesos almacenados en kg', () => {
  it('mantiene pesos numéricos en kg independientemente de la unidad visual configurada', async () => {
    const { setWeightUnit, weightUnit } = await import('./units');
    const prevUnit = weightUnit();
    try {
      setWeightUnit('lb'); // Cambiamos la unidad visual global a libras

      const d = emptyData();
      const src = memSource(d);

      // Registramos un entreno con peso 100 kg
      await callTool(src, 'log_workout', {
        name: 'Pierna Pesada',
        exercises: [{ name: 'Sentadilla (barra)', sets: [{ weight: 100, reps: 5 }] }],
      });

      // En los datos internos el peso debe estar estrictamente en 100 (kg), no convertido a lb
      expect(d.workouts[0].exercises[0].sets[0].weight).toBe(100);

      // Al crear rutina con 100 kg
      await callTool(src, 'create_routine', {
        name: 'Rutina Fuerza',
        exercises: [{ name: 'Sentadilla (barra)', sets: 3, weight: 100, reps: 5 }],
      });
      expect(d.routines[0].exercises[0].sets[0].weight).toBe(100);

      // Al registrar medida con 80 kg
      await callTool(src, 'log_measurement', { bodyweight: 80 });
      expect(d.measurements[0].bodyweight).toBe(80);

      // En remoto con cloudSource via fakeSupabase
      const sb = fakeSupabase();
      const remoteSrc = cloudSource({ url: 'https://x.supabase.co', anonKey: 'anon', apiKey: 'ws_ok', fetch: sb.f });
      await callTool(remoteSrc, 'log_workout', {
        name: 'Remoto Pierna',
        exercises: [{ name: 'Sentadilla (barra)', sets: [{ weight: 105, reps: 5 }] }],
      });
      // Comprobar que en el payload de Supabase el peso está guardado exactamente como 105 kg
      const remoteWorkoutRow = [...sb.rows.values()].find((r) => r.collection === 'workouts');
      const doc = remoteWorkoutRow?.doc as { exercises: Array<{ sets: Array<{ weight: number }> }> };
      expect(doc.exercises[0].sets[0].weight).toBe(105);
    } finally {
      setWeightUnit(prevUnit);
    }
  });
});
