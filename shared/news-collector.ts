import { deduplicateNews, normalizeNewsItem, parseNewsFeed, type NewsArticle } from './news';
import { NEWS_SOURCE_CANDIDATES, parsePlosDocItem, parsePubMedSummaryItem, type NewsSourceCandidate } from './news-sources';

export const NEWS_TTL_MS = 60 * 60 * 1000;
export const NEWS_MAX_BYTES = 2_000_000;
export const NEWS_TIMEOUT_MS = 8000;
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

interface CachedSource {
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

/** Una actualización simultánea por instancia; fallos consumen TTL para no agotar cuotas. */
export function createNewsCollector(fetcher: typeof fetch, resolve: ResolveNewsHost, now = Date.now) {
  const cache = new Map<string, CachedSource>();
  let pending: Promise<NewsResult> | undefined;
  const collect = async (): Promise<NewsResult> => {
    const sources = NEWS_SOURCE_CANDIDATES.filter((s) => s.status === 'aprobada');
    for (const source of sources) {
      const previous = cache.get(source.id);
      const attemptedAt = now();
      if (previous && newsCacheFresh(previous.attemptedAt, attemptedAt)) continue;
      try {
        const items = await fetchNewsSource(source, fetcher, resolve);
        cache.set(source.id, { attemptedAt, updatedAt: new Date(now()).toISOString(), items });
      } catch {
        cache.set(source.id, { attemptedAt, updatedAt: previous?.updatedAt ?? null, items: previous?.items ?? [], error: 'Fuente no disponible' });
      }
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
