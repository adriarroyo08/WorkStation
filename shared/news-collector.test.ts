import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { allowedNewsEndpoint, createNewsCollector, fetchNewsSource, handleNews, isPublicNewsAddress, NEWS_MAX_BYTES, NEWS_TIMEOUT_MS, NEWS_TTL_MS, newsCacheFresh } from './news-collector';
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
