import { deduplicateNews, normalizeNewsItem, parseNewsFeed, type NewsArticle } from './news';
import { NEWS_SOURCE_CANDIDATES, parsePlosDocItem, parsePubMedSummaryItem, type NewsSourceCandidate } from './news-sources';

export const NEWS_TTL_MS = 60 * 60 * 1000;
export const NEWS_MAX_BYTES = 2_000_000;
export const NEWS_TIMEOUT_MS = 8000;
export const NEWS_CLAIM_RETRY_MS = 60 * 1000;
export type ResolveNewsHost = (host: string) => Promise<string[]>;

/** Solo direcciones públicas; IPv6 se limita al espacio unicast global. */
export function isPublicNewsAddress(address: string): boolean {
  if (address.includes(':')) {
    const ip = address.toLowerCase();
    return /^[23][0-9a-f]{3}:/.test(ip) && !ip.startsWith('2001:db8:') && !ip.startsWith('2001:0:') && !ip.startsWith('2002:');
  }
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(address)) return false;
  const parts = address.split('.').map(Number);
  if (parts.some((n) => n > 255)) return false;
  const [a, b] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a! >= 224 ||
    (a === 100 && b! >= 64 && b! <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && (b === 168 || b === 0 || b === 2)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
  );
}

/** Coincidencia exacta con la configuración; ninguna URL de la petición llega al fetch. */
export function allowedNewsEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      !url.hostname.includes(':') &&
      !/^[\d.]+$/.test(url.hostname) &&
      !/(^|\.)(localhost|local|internal)$/.test(url.hostname) &&
      NEWS_SOURCE_CANDIDATES.some((s) => s.status === 'aprobada' && s.endpoint === endpoint)
    );
  } catch {
    return false;
  }
}

export function newsCacheFresh(attemptedAt: number, now: number): boolean {
  return now >= attemptedAt && now - attemptedAt < NEWS_TTL_MS;
}

function parseResponse(text: string, source: NewsSourceCandidate): NewsArticle[] {
  if (source.format !== 'json-rest') return parseNewsFeed(text, source.id);
  const json = JSON.parse(text);
  let snippets;
  if (source.id === 'plos-one') {
    if (!Array.isArray(json.response?.docs)) throw new Error('Respuesta PLOS inválida');
    snippets = json.response.docs.map(parsePlosDocItem);
  } else if (source.id === 'pubmed-eutils') {
    if (!Array.isArray(json.result?.uids)) throw new Error('Respuesta PubMed inválida (requiere IDs configurados)');
    snippets = json.result.uids.map((id: string) => parsePubMedSummaryItem(id, json.result[id]));
  } else {
    if (!Array.isArray(json.message?.items)) throw new Error('Respuesta Crossref inválida');
    snippets = json.message.items.map((item: { title?: string[]; URL?: string; DOI?: string; created?: { 'date-time'?: string } }) => ({
      sourceId: source.id,
      title: item.title?.[0] ?? '',
      url: item.URL ?? '',
      doi: item.DOI,
      publishedAt: item.created?.['date-time'],
      shortSummary: '',
    }));
  }
  return deduplicateNews(
    snippets
      .map((item: { sourceId: string; title: string; url: string; shortSummary?: string; publishedAt?: string }) => normalizeNewsItem({ ...item, contentOrSummary: item.shortSummary }))
      .filter((item: NewsArticle | undefined): item is NewsArticle => !!item),
  );
}

export async function fetchNewsSource(source: NewsSourceCandidate, fetcher: typeof fetch, resolve: ResolveNewsHost): Promise<NewsArticle[]> {
  if (!allowedNewsEndpoint(source.endpoint)) throw new Error('Endpoint no autorizado');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Tiempo de espera agotado'));
    }, NEWS_TIMEOUT_MS);
  });
  const work = async () => {
    const addresses = await resolve(new URL(source.endpoint).hostname);
    controller.signal.throwIfAborted();
    if (!addresses.length || !addresses.every(isPublicNewsAddress)) throw new Error('Host no público');
    const response = await fetcher(source.endpoint, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'application/rss+xml, application/atom+xml, application/json, application/xml' },
    });
    try {
      if (!response.ok || response.redirected) throw new Error(`Fuente HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > NEWS_MAX_BYTES) throw new Error('Feed demasiado grande');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Feed sin cuerpo');
      const decoder = new TextDecoder();
      let bytes = 0,
        text = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > NEWS_MAX_BYTES) throw new Error('Feed demasiado grande');
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        await reader.cancel();
      }
      return parseResponse(text, source);
    } finally {
      await response.body?.cancel().catch(() => {});
    }
  };
  try {
    return await Promise.race([work(), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export interface CachedSource {
  attemptedAt: number;
  updatedAt: string | null;
  items: NewsArticle[];
  error?: string;
}
export interface NewsResult {
  updatedAt: string | null;
  items: NewsArticle[];
  sources: { id: string; updatedAt: string | null; stale: boolean; error?: string }[];
}

/** Caché común a todas las instancias. Si falla, cada instancia sigue con su memoria. */
export interface NewsCacheStore {
  read(): Promise<Map<string, CachedSource>>;
  /** true si esta instancia debe descargar la fuente; false si otra lo está haciendo o ya está al día. */
  claim(sourceId: string): Promise<boolean>;
  write(sourceId: string, entry: CachedSource): Promise<void>;
}

const NEWS_UNAVAILABLE = 'Fuente no disponible';

function isNewsArticle(item: unknown): item is NewsArticle {
  const a = item as Partial<NewsArticle> | null;
  return !!a && typeof a === 'object' && [a.id, a.sourceId, a.title, a.url, a.publishedAt].every((v) => typeof v === 'string') && Array.isArray(a.topics);
}

/** Convierte una fila de news_cache; descarta las de fuentes fuera del catálogo o con forma inesperada. */
function parseCacheRow(row: { source_id?: unknown; items?: unknown; updated_at?: unknown; attempted_at?: unknown; error?: unknown }): CachedSource | undefined {
  const attemptedAt = Date.parse(String(row.attempted_at));
  if (!NEWS_SOURCE_CANDIDATES.some((s) => s.status === 'aprobada' && s.id === row.source_id)) return undefined;
  if (!Number.isFinite(attemptedAt) || !Array.isArray(row.items) || !row.items.every(isNewsArticle)) return undefined;
  return { attemptedAt, updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null, items: row.items, ...(typeof row.error === 'string' ? { error: row.error } : {}) };
}

/** Caché en la tabla news_cache (migración 012). Usa service role: solo debe construirse en el servidor. */
export function supabaseNewsStore(o: { url: string; serviceKey: string; fetch?: typeof fetch }): NewsCacheStore {
  const f = o.fetch ?? fetch;
  const call = async (path: string, body?: unknown) => {
    const response = await f(`${o.url.replace(/\/$/, '')}/rest/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: o.serviceKey, authorization: `Bearer ${o.serviceKey}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(NEWS_TIMEOUT_MS),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`news_cache HTTP ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
  return {
    async read() {
      const rows = (await call('news_cache?select=source_id,items,updated_at,attempted_at,error')) as { source_id: string }[];
      const out = new Map<string, CachedSource>();
      for (const row of rows) {
        const entry = parseCacheRow(row);
        if (entry) out.set(row.source_id, entry);
      }
      return out;
    },
    claim: async (sourceId) => (await call('rpc/news_cache_claim', { p_source: sourceId, p_ttl_seconds: NEWS_TTL_MS / 1000 })) === true,
    write: async (sourceId, entry) => void (await call('rpc/news_cache_store', { p_source: sourceId, p_items: entry.items, p_updated_at: entry.updatedAt, p_error: entry.error ?? null })),
  };
}

/** Una actualización simultánea por instancia; fallos consumen TTL para no agotar cuotas. Con `store`, una descarga por fuente y hora entre todas las instancias. */
export function createNewsCollector(fetcher: typeof fetch, resolve: ResolveNewsHost, now = Date.now, store?: NewsCacheStore) {
  const cache = new Map<string, CachedSource>();
  let pending: Promise<NewsResult> | undefined;
  const collect = async (): Promise<NewsResult> => {
    const sources = NEWS_SOURCE_CANDIDATES.filter((s) => s.status === 'aprobada');
    const expired = (id: string, at: number) => {
      const entry = cache.get(id);
      return !entry || !newsCacheFresh(entry.attemptedAt, at);
    };
    if (store && sources.some((s) => expired(s.id, now()))) {
      const shared = await store.read().catch(() => undefined);
      for (const [id, entry] of shared ?? []) if (!cache.has(id) || entry.attemptedAt > cache.get(id)!.attemptedAt) cache.set(id, entry);
    }
    for (const source of sources) {
      const attemptedAt = now();
      if (!expired(source.id, attemptedAt)) continue;
      const previous = cache.get(source.id);
      if (store && !(await store.claim(source.id).catch(() => true))) {
        // Otra instancia la está descargando: se sirve lo que haya y se vuelve a mirar la caché común dentro de poco.
        cache.set(source.id, { ...(previous ?? { updatedAt: null, items: [], error: NEWS_UNAVAILABLE }), attemptedAt: attemptedAt - NEWS_TTL_MS + NEWS_CLAIM_RETRY_MS });
        continue;
      }
      let entry: CachedSource;
      try {
        entry = { attemptedAt, updatedAt: new Date(now()).toISOString(), items: await fetchNewsSource(source, fetcher, resolve) };
      } catch {
        entry = { attemptedAt, updatedAt: previous?.updatedAt ?? null, items: previous?.items ?? [], error: NEWS_UNAVAILABLE };
      }
      cache.set(source.id, entry);
      await store?.write(source.id, entry).catch(() => {});
    }
    const states = sources.map((s) => ({ id: s.id, ...cache.get(s.id)! }));
    const dates = states
      .map((s) => s.updatedAt)
      .filter((d): d is string => !!d)
      .sort();
    return {
      updatedAt: dates.at(-1) ?? null,
      items: deduplicateNews(states.flatMap((s) => s.items)),
      sources: states.map((s) => ({ id: s.id, updatedAt: s.updatedAt, stale: !!s.error, ...(s.error ? { error: s.error } : {}) })),
    };
  };
  return () => {
    pending ??= collect().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}

export async function handleNews(req: Request, collect: () => Promise<NewsResult>): Promise<Response> {
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store', allow: 'GET, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET, OPTIONS' } });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Método no soportado' }), { status: 405, headers });
  if (new URL(req.url).search) return new Response(JSON.stringify({ error: 'No se admiten parámetros' }), { status: 400, headers });
  return new Response(JSON.stringify(await collect()), { headers });
}
