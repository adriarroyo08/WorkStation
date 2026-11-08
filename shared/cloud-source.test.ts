import { describe, expect, it } from 'vitest';
import { cloudSource } from './cloud-source';

function fakeFetch() {
  const upserts: unknown[][] = [];
  const f = (async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { p_rows?: unknown[] };
    if (url.endsWith('/api_upsert')) upserts.push(body.p_rows!);
    return new Response(url.endsWith('/api_records') ? '[]' : '1', { status: 200 });
  }) as unknown as typeof fetch;
  return { f, upserts };
}

describe('cloudSource.save', () => {
  it('trocea las escrituras grandes por debajo del tope de filas de api_upsert', async () => {
    const { f, upserts } = fakeFetch();
    const src = cloudSource({ url: 'https://x.supabase.co', anonKey: 'a', apiKey: 'ws_x', fetch: f });
    const data = await src.load();
    for (let i = 0; i < 2300; i++) data.workouts.push({ id: `w${i}`, name: 'x', startedAt: '2026-11-01T10:00:00Z', exercises: [] });
    await src.save(data);
    expect(upserts.every((rows) => rows.length <= 1000)).toBe(true);
    expect(upserts.flat()).toHaveLength(2300);
  });
});
