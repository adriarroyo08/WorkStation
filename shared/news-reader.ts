import type { NewsArticle } from './news';
import type { NewsResult } from './news-collector';
import type { NewsTopic } from './news-sources';

export const NEWS_CACHE_KEY = 'ws:news:v1';
export const NEWS_TOPICS: Record<NewsTopic, string> = {
  fuerza: 'Fuerza',
  hipertrofia: 'Hipertrofia',
  nutricion: 'Nutrición',
  fisiologia: 'Fisiología',
  biomecanica: 'Biomecánica',
  recuperacion: 'Recuperación',
  general: 'General',
};

function safeLink(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Valida tanto la respuesta remota como la copia local antes de mostrar enlaces. */
export function parseNewsResult(value: unknown): NewsResult | undefined {
  if (!value || typeof value !== 'object') return;
  const r = value as NewsResult;
  if (!(r.updatedAt === null || validDate(r.updatedAt)) || !Array.isArray(r.items) || !Array.isArray(r.sources)) return;
  if (
    !r.sources.every((s) => s && typeof s.id === 'string' && typeof s.stale === 'boolean' && (s.updatedAt === null || validDate(s.updatedAt)) && (s.error === undefined || typeof s.error === 'string'))
  )
    return;
  if (
    !r.items.every(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        typeof a.sourceId === 'string' &&
        typeof a.title === 'string' &&
        typeof a.shortSummary === 'string' &&
        safeLink(a.url) &&
        (a.publishedAt === '' || validDate(a.publishedAt)) &&
        Array.isArray(a.topics) &&
        a.topics.every((t) => Object.hasOwn(NEWS_TOPICS, t)) &&
        (a.journalOrSource === undefined || typeof a.journalOrSource === 'string') &&
        (a.authors === undefined || (Array.isArray(a.authors) && a.authors.every((author) => typeof author === 'string'))),
    )
  )
    return;
  return r;
}

export function filterNews(items: readonly NewsArticle[], source = '', topic = ''): NewsArticle[] {
  return items.filter((a) => (!source || a.sourceId === source) && (!topic || a.topics.some((t) => t === topic)));
}

/** Un fallo total del recolector nunca sustituye una respuesta buena por un vacío. */
export function newsUnavailable(result: NewsResult): boolean {
  return result.updatedAt === null && result.items.length === 0 && result.sources.some((s) => s.stale || s.error);
}
