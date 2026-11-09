import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  allowedNewsEndpoint,
  createNewsCollector,
  fetchNewsSource,
  handleNews,
  isPublicNewsAddress,
  NEWS_CLAIM_RETRY_MS,
  NEWS_MAX_BYTES,
  NEWS_TIMEOUT_MS,
  NEWS_TTL_MS,
  newsCacheFresh,
  supabaseNewsStore,
  type CachedSource,
  type NewsCacheStore,
} from './news-collector';
import { NEWS_SOURCE_CANDIDATES } from './news-sources';
const source = NEWS_SOURCE_CANDIDATES.find((s) => s.id === 'stronger-by-science')!;
const xml = readFileSync(new URL('./fixtures/news/stronger.xml', import.meta.url), 'utf8');
const resolve = async () => ['8.8.8.8', '2606:4700:4700::1111'];
const feed = () => new Response(xml);
afterEach(() => vi.useRealTimers());

describe('seguridad del recolector', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '256.1.1.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
    '2002:7f00::1',
    'localhost',
  ])('rechaza %s', (ip) => expect(isPublicNewsAddress(ip)).toBe(false));
  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('acepta %s', (ip) => expect(isPublicNewsAddress(ip)).toBe(true));
  it.each([
    'http://www.strongerbyscience.com/feed/',
    'https://www.strongerbyscience.com/otro',
    'https://evil.test/feed/',
    'https://127.0.0.1/feed/',
    'https://localhost/feed/',
    'https://[::1]/',
    'https://user:pass@www.strongerbyscience.com/feed/',
    'no url',
    'https://www.vitonica.com/feedburner.xml',
  ])('rechaza endpoint %s', (url) => expect(allowedNewsEndpoint(url)).toBe(false));
  it('comprueba el endpoint antes de resolver o descargar', async () => {
    const fetcher = vi.fn();
    const resolver = vi.fn();
    await expect(fetchNewsSource({ ...source, endpoint: 'https://evil.test/' }, fetcher, resolver)).rejects.toThrow('autorizado');
    expect(fetcher).not.toHaveBeenCalled();
    expect(resolver).not.toHaveBeenCalled();
  });
  it('rechaza DNS privado, mixto o vacío', async () => {
    for (const ips of [[], ['127.0.0.1'], ['8.8.8.8', '10.0.0.1']]) {
      const fetcher = vi.fn();
      await expect(fetchNewsSource(source, fetcher, async () => ips)).rejects.toThrow('público');
      expect(fetcher).not.toHaveBeenCalled();
    }
  });
  it('no sigue redirecciones y rechaza cuotas HTTP', async () => {
    for (const status of [301, 302, 307, 429, 500]) {
      const fetcher = vi.fn(async () => new Response('', { status, headers: { location: 'https://127.0.0.1/' } }));
      await expect(fetchNewsSource(source, fetcher, resolve)).rejects.toThrow('HTTP');
      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher.mock.calls[0]).toEqual([source.endpoint, expect.objectContaining({ redirect: 'manual' })]);
    }
  });
  it('limita bytes declarados y transmitidos aunque falte content-length', async () => {
    await expect(fetchNewsSource(source, async () => new Response('x', { headers: { 'content-length': String(NEWS_MAX_BYTES + 1) } }), resolve)).rejects.toThrow('grande');
    await expect(fetchNewsSource(source, async () => new Response(new Uint8Array(NEWS_MAX_BYTES + 1)), resolve)).rejects.toThrow('grande');
    await expect(fetchNewsSource(source, async () => new Response(null), resolve)).rejects.toThrow('cuerpo');
    await expect(fetchNewsSource(source, async () => new Response('<invalid>'), resolve)).rejects.toThrow();
  });
  it('corta el timeout incluso durante DNS', async () => {
    vi.useFakeTimers();
    const result = expect(fetchNewsSource(source, vi.fn(), () => new Promise(() => {}))).rejects.toThrow('espera');
    await vi.advanceTimersByTimeAsync(NEWS_TIMEOUT_MS);
    await result;
  });
  it('corta durante la lectura y aborta el fetch', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const result = expect(
      fetchNewsSource(
        source,
        async (_url, init) => {
          signal = init?.signal;
          return new Response(new ReadableStream());
        },
        resolve,
      ),
    ).rejects.toThrow('espera');
    await vi.advanceTimersByTimeAsync(NEWS_TIMEOUT_MS);
    await result;
    expect(signal?.aborted).toBe(true);
  });
});

describe('cache y JSON', () => {
  it('TTL exacto y reloj atrasado', () => {
    expect(newsCacheFresh(100, 100)).toBe(true);
    expect(newsCacheFresh(100, 100 + NEWS_TTL_MS - 1)).toBe(true);
    expect(newsCacheFresh(100, 100 + NEWS_TTL_MS)).toBe(false);
    expect(newsCacheFresh(100, 99)).toBe(false);
  });
  it('fusiona fuentes, conserva el último éxito, limita reintentos y comparte solicitudes', async () => {
    let now = 0;
    let fails = false;
    const fetcher = vi.fn(async () => {
      if (fails) throw new Error('offline');
      return feed();
    });
    const collect = createNewsCollector(fetcher, resolve, () => now);
    const [first, concurrent] = await Promise.all([collect(), collect()]);
    expect(first).toEqual(concurrent);
    expect(first.items.length).toBeGreaterThan(0);
    const count = NEWS_SOURCE_CANDIDATES.filter((s) => s.status === 'aprobada').length;
    expect(fetcher).toHaveBeenCalledTimes(count);
    await collect();
    expect(fetcher).toHaveBeenCalledTimes(count);
    now += NEWS_TTL_MS;
    fails = true;
    const stale = await collect();
    expect(stale.items).toEqual(first.items);
    expect(stale.updatedAt).toEqual(first.updatedAt);
    expect(stale.sources.every((s) => s.stale)).toBe(true);
    await collect();
    expect(fetcher).toHaveBeenCalledTimes(count * 2);
    now += NEWS_TTL_MS;
    fails = false;
    expect((await collect()).sources.find((s) => s.id === source.id)?.stale).toBe(false);
  });
  it('fallo parcial no borra las demás fuentes', async () => {
    const collect = createNewsCollector(async (url) => {
      if (url !== source.endpoint) return new Response('', { status: 429 });
      return feed();
    }, resolve);
    const result = await collect();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.sources.find((s) => s.id === source.id)?.stale).toBe(false);
    expect(result.sources.filter((s) => s.stale).every((s) => s.updatedAt === null)).toBe(true);
  });
  it('normaliza APIs JSON configuradas sin peticiones adicionales', async () => {
    const fixtures: Record<string, unknown> = {
      'plos-one': { response: { docs: [{ title: 'PLOS', id: '10.1/test', publication_date: '2026-01-01', abstract: ['breve'] }] } },
      'pubmed-eutils': { result: { uids: ['123'], '123': { title: 'PubMed', pubdate: '2026-01-01' } } },
      'crossref-api': { message: { items: [{ title: ['Crossref'], URL: 'https://doi.org/10.1/test', created: { 'date-time': '2026-01-01' } }, {}] } },
    };
    for (const [id, json] of Object.entries(fixtures)) {
      const config = NEWS_SOURCE_CANDIDATES.find((s) => s.id === id)!;
      const items = await fetchNewsSource(config, async () => new Response(JSON.stringify(json)), resolve);
      expect(items).toHaveLength(1);
      expect(items[0].sourceId).toBe(id);
      await expect(fetchNewsSource(config, async () => new Response('{}'), resolve)).rejects.toThrow('inválida');
    }
  });
  it('sirve JSON y rechaza parámetros y métodos sin recolectar', async () => {
    const collect = vi.fn(async () => ({ updatedAt: null, items: [], sources: [] }));
    for (const method of ['POST', 'PUT']) expect((await handleNews(new Request('https://test/mcp/news', { method }), collect)).status).toBe(405);
    expect((await handleNews(new Request('https://test/mcp/news?url=https://evil.test'), collect)).status).toBe(400);
    expect((await handleNews(new Request('https://test/mcp/news', { method: 'OPTIONS' }), collect)).status).toBe(204);
    expect(collect).not.toHaveBeenCalled();
    const response = await handleNews(new Request('https://test/mcp/news'), collect);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updatedAt: null, items: [], sources: [] });
  });
});

describe('caché compartida entre instancias', () => {
  const approved = NEWS_SOURCE_CANDIDATES.filter((s) => s.status === 'aprobada');
  const article = { id: 'a', sourceId: source.id, title: 'Título', shortSummary: '', url: 'https://x.test/a', publishedAt: '2026-01-01', language: 'en', topics: [] };

  // Hace de la tabla news_cache con sus reglas: reserva única mientras la fuente esté caducada.
  function memoryStore(clock: () => number) {
    const rows = new Map<string, CachedSource>();
    const leased = new Set<string>();
    const store: NewsCacheStore = {
      read: vi.fn(async () => new Map(rows)),
      claim: vi.fn(async (id: string) => {
        const row = rows.get(id);
        if (leased.has(id) || (row && newsCacheFresh(row.attemptedAt, clock()))) return false;
        leased.add(id);
        return true;
      }),
      write: vi.fn(async (id: string, entry: CachedSource) => {
        rows.set(id, entry);
        leased.delete(id);
      }),
    };
    return { store, rows, leased };
  }
  const counting = () => {
    const fetcher = vi.fn(async () => new Response(xml));
    return fetcher as unknown as typeof fetch & typeof fetcher;
  };

  it('dos instancias descargan cada fuente una sola vez y comparten el resultado', async () => {
    let now = 1_000_000;
    const clock = () => now;
    const { store } = memoryStore(clock);
    const first = counting();
    const second = counting();
    const a = await createNewsCollector(first, resolve, clock, store)();
    expect(first).toHaveBeenCalledTimes(approved.length);
    now += 1000;
    const b = await createNewsCollector(second, resolve, clock, store)();
    expect(second).not.toHaveBeenCalled();
    expect(b.items).toEqual(a.items);
    expect(b.updatedAt).toBe(a.updatedAt);
  });

  it('con la memoria al día no consulta la caché compartida', async () => {
    const now = 1_000_000;
    const { store } = memoryStore(() => now);
    const collect = createNewsCollector(counting(), resolve, () => now, store);
    await collect();
    await collect();
    expect(store.read).toHaveBeenCalledTimes(1);
  });

  it('caducado el TTL vuelve a descargar una sola instancia', async () => {
    let now = 1_000_000;
    const clock = () => now;
    const { store } = memoryStore(clock);
    const first = counting();
    const second = counting();
    const a = createNewsCollector(first, resolve, clock, store);
    const b = createNewsCollector(second, resolve, clock, store);
    await a();
    now += NEWS_TTL_MS;
    await a();
    await b();
    expect(first).toHaveBeenCalledTimes(approved.length * 2);
    expect(second).not.toHaveBeenCalled();
  });

  it('si otra instancia tiene la reserva no descarga, y vuelve a mirar pasado el margen', async () => {
    let now = 1_000_000;
    const clock = () => now;
    const { store, rows, leased } = memoryStore(clock);
    for (const s of approved) leased.add(s.id);
    const fetcher = counting();
    const collect = createNewsCollector(fetcher, resolve, clock, store);
    const during = await collect();
    expect(fetcher).not.toHaveBeenCalled();
    expect(during.items).toEqual([]);
    expect(during.sources.every((s) => s.stale)).toBe(true);
    await collect();
    expect(store.read).toHaveBeenCalledTimes(1); // dentro del margen no insiste
    for (const s of approved) rows.set(s.id, { attemptedAt: now, updatedAt: '2026-01-02T00:00:00.000Z', items: s.id === source.id ? [article as never] : [] });
    leased.clear();
    now += NEWS_CLAIM_RETRY_MS;
    const after = await collect();
    expect(store.read).toHaveBeenCalledTimes(2);
    expect(fetcher).not.toHaveBeenCalled();
    expect(after.items.map((i) => i.id)).toEqual(['a']);
    expect(after.sources.every((s) => !s.stale)).toBe(true);
  });

  it('un fallo se guarda y conserva las noticias anteriores', async () => {
    let now = 1_000_000;
    const clock = () => now;
    const { store } = memoryStore(clock);
    const good = await createNewsCollector(counting(), resolve, clock, store)();
    now += NEWS_TTL_MS;
    const bad = await createNewsCollector(async () => new Response('', { status: 503 }), resolve, clock, store)();
    expect(bad.items).toEqual(good.items);
    expect(bad.updatedAt).toBe(good.updatedAt);
    expect(bad.sources.every((s) => s.stale)).toBe(true);
    expect(vi.mocked(store.write).mock.calls.at(-1)![1]).toMatchObject({ error: 'Fuente no disponible' });
  });

  it('si la caché compartida falla, sirve con la memoria de la instancia', async () => {
    const now = 1_000_000;
    const down = new Error('sin base de datos');
    const store: NewsCacheStore = { read: async () => Promise.reject(down), claim: async () => Promise.reject(down), write: async () => Promise.reject(down) };
    const fetcher = counting();
    const collect = createNewsCollector(fetcher, resolve, () => now, store);
    const first = await collect();
    expect(first.items.length).toBeGreaterThan(0);
    await collect();
    expect(fetcher).toHaveBeenCalledTimes(approved.length); // la memoria sigue limitando las descargas
  });

  describe('adaptador de Supabase', () => {
    const row = { source_id: source.id, items: [article], updated_at: '2026-01-02T00:00:00.000Z', attempted_at: '2026-01-02T00:00:00.000Z', error: null };
    const adapter = (respond: (url: string, init: RequestInit) => Response) => {
      const f = vi.fn(async (url: string, init: RequestInit) => respond(url, init));
      return { f, store: supabaseNewsStore({ url: 'https://x.supabase.co/', serviceKey: 'service', fetch: f as unknown as typeof fetch }) };
    };

    it('lee con service role y descarta filas de fuentes desconocidas o mal formadas', async () => {
      const others = approved.filter((s) => s.id !== source.id);
      const { f, store } = adapter(
        () =>
          new Response(
            JSON.stringify([
              row,
              { ...row, source_id: 'inventada' },
              { ...row, source_id: others[0].id, items: 'no' },
              { ...row, source_id: others[1].id, items: [{ title: 'sin campos' }] },
              { ...row, source_id: others[2].id, attempted_at: null },
            ]),
          ),
      );
      const read = await store.read();
      expect([...read.keys()]).toEqual([source.id]);
      expect(read.get(source.id)).toEqual({ attemptedAt: Date.parse(row.attempted_at), updatedAt: row.updated_at, items: [article] });
      const [url, init] = f.mock.calls[0];
      expect(url).toBe('https://x.supabase.co/rest/v1/news_cache?select=source_id,items,updated_at,attempted_at,error');
      expect(init.headers).toMatchObject({ apikey: 'service', authorization: 'Bearer service' });
    });

    it('reserva y guarda por RPC', async () => {
      const bodies: Record<string, unknown> = {};
      const { store } = adapter((url, init) => {
        bodies[url.split('/rpc/')[1]] = JSON.parse(String(init.body));
        return url.endsWith('news_cache_claim') ? new Response('true') : new Response(null, { status: 204 });
      });
      expect(await store.claim(source.id)).toBe(true);
      await store.write(source.id, { attemptedAt: 1, updatedAt: null, items: [], error: 'Fuente no disponible' });
      expect(bodies).toEqual({
        news_cache_claim: { p_source: source.id, p_ttl_seconds: NEWS_TTL_MS / 1000 },
        news_cache_store: { p_source: source.id, p_items: [], p_updated_at: null, p_error: 'Fuente no disponible' },
      });
    });

    it('un claim que no devuelve true no reserva, y un error HTTP se propaga', async () => {
      expect(await adapter(() => new Response('false')).store.claim(source.id)).toBe(false);
      await expect(adapter(() => new Response('{}', { status: 500 })).store.read()).rejects.toThrow('HTTP 500');
    });
  });
});
