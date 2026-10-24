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
