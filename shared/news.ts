import { NEWS_SOURCE_CANDIDATES } from './news-sources';
import type { NewsArticleSnippet, NewsSourceCandidate, NewsTopic, RawNewsItemInput } from './news-sources';

/** Techo global; prevalece cualquier límite menor del catálogo. */
export const NEWS_SUMMARY_MAX_CHARS = 280;
/** Fecha desconocida: cadena vacía, nunca la hora de ingesta. Se ordena al final. */
export interface NewsArticle extends NewsArticleSnippet {
  topics: NewsTopic[];
}

const ATOM = 'http://www.w3.org/2005/Atom';
const RSS = 'http://purl.org/rss/1.0/';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const DC = 'http://purl.org/dc/elements/1.1/';
const XML = 'http://www.w3.org/XML/1998/namespace';

function sourceFor(id: string): NewsSourceCandidate {
  const source = NEWS_SOURCE_CANDIDATES.find((s) => s.id === id && s.status === 'aprobada');
  if (!source) throw new Error(`Fuente no aprobada: ${id}`);
  return source;
}

/** Decodificación local de entidades comunes y numéricas; nunca consulta un DTD o la red. */
function decode(input: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    aacute: 'á',
    eacute: 'é',
    iacute: 'í',
    oacute: 'ó',
    uacute: 'ú',
    ntilde: 'ñ',
    Aacute: 'Á',
    Eacute: 'É',
    Iacute: 'Í',
    Oacute: 'Ó',
    Uacute: 'Ú',
    Ntilde: 'Ñ',
    ndash: '–',
    mdash: '—',
    hellip: '…',
    rsquo: '’',
    lsquo: '‘',
    ldquo: '“',
    rdquo: '”',
  };
  return input.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
    if (!key.startsWith('#')) return Object.hasOwn(named, key) ? named[key]! : entity;
    const point = key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '\uFFFD';
  });
}

function plainText(input: string): string {
  return decode(input)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
    .replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
    .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeUrl(input: string, base?: string): string | undefined {
  if (!input.trim() || Array.from(input.trim()).some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\')) return undefined;
  try {
    const url = new URL(input.trim(), base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    url.hash = '';
    return url.href;
  } catch {
    return undefined;
  }
}

function date(input = ''): string {
  // Fechas sin zona horaria se interpretan explícitamente en UTC, también en el navegador.
  const value = input.trim();
  const iso = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(value);
  const zoned = /(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)$/i.test(value);
  if (!iso && !zoned) return '';
  const calendar = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (calendar) {
    const [, year, month, day] = calendar;
    const y = Number(year),
      m = Number(month),
      d = Number(day);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m < 1 || m > 12 || d < 1 || d > days[m - 1]!) return '';
  }
  const parsed = Date.parse(iso ? `${value}${value.includes('T') ? 'Z' : 'T00:00:00Z'}` : value);
  if (!Number.isFinite(parsed)) return '';
  const result = new Date(parsed).toISOString();
  // También evita el salto al día siguiente de una hora como 24:00 sin zona.
  if (/^\d{4}-\d{2}-\d{2}/.test(value) && result.slice(0, 10) !== value.slice(0, 10) && iso) return '';
  return result;
}

/** Normaliza metadatos sin importar cuerpos de artículos. Entradas inválidas se omiten. */
export function normalizeNewsItem(raw: RawNewsItemInput, baseUrl?: string): NewsArticle | undefined {
  const source = sourceFor(raw.sourceId);
  const title = plainText(raw.title);
  const url = safeUrl(raw.url, baseUrl);
  if (!title || !url) return undefined;
  const limit = Math.max(0, Math.min(NEWS_SUMMARY_MAX_CHARS, Math.floor(source.permits.maxSummaryChars)));
  const text = source.permits.shortSummary ? Array.from(plainText(raw.contentOrSummary ?? '')) : [];
  const shortSummary =
    text.length > limit
      ? limit
        ? `${text
            .slice(0, limit - 1)
            .join('')
            .trimEnd()}…`
        : ''
      : text.join('');
  return {
    id: `${source.id}:${encodeURIComponent(url)}`,
    sourceId: source.id,
    title,
    shortSummary,
    url,
    publishedAt: date(raw.publishedAt),
    authors: raw.authors?.map(plainText).filter(Boolean),
    doi: raw.doi?.trim(),
    journalOrSource: source.name,
    language: source.language,
    topics: [...source.topics],
  };
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** URL canónica sin fragmento como clave; gana la fecha más reciente y después el orden léxico. */
export function deduplicateNews(items: readonly NewsArticle[]): NewsArticle[] {
  const sorted = [...items].sort((a, b) => compare(b.publishedAt, a.publishedAt) || compare(a.id, b.id) || compare(JSON.stringify(a), JSON.stringify(b)));
  const seen = new Set<string>();
  return sorted.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

interface Element {
  name: string;
  local: string;
  ns: string;
  attrs: Record<string, string>;
  namespaces: Record<string, string>;
  base: string;
  children: Element[];
  text: string;
}

/** Subconjunto XML de feeds: sin DOM (idéntico en Node, Deno y navegador), sin DTD.
 * Límites de tamaño/profundidad evitan entradas patológicas; XML roto falla de forma explícita.
 */
function parseXml(xml: string, base: string): Element {
  if (xml.length > 2_000_000) throw new Error('Feed demasiado grande');
  const document: Element = { name: '', local: '', ns: '', attrs: {}, namespaces: { xml: XML }, base, children: [], text: '' };
  const stack = [document];
  const tokens = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/?[A-Za-z_][\w.:-]*(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/g;
  let end = 0;
  for (const match of xml.matchAll(tokens)) {
    if (match.index !== end) throw new Error('XML no admitido (DTD o marcado inválido)');
    const token = match[0];
    end = match.index + token.length;
    const parent = stack[stack.length - 1]!;
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (token.startsWith('<![CDATA[')) {
      parent.text += token.slice(9, -3);
      continue;
    }
    if (!token.startsWith('<')) {
      parent.text += decode(token);
      continue;
    }
    if (token.startsWith('</')) {
      if (stack.length === 1 || /^<\/([\w.:-]+)\s*>$/.exec(token)?.[1] !== parent.name) throw new Error('XML desbalanceado');
      stack.pop();
      if (stack.length > 1) stack[stack.length - 1]!.text += `<${parent.local}>${parent.text}</${parent.local}>`;
      continue;
    }
    const name = /^<([\w.:-]+)/.exec(token)![1]!;
    const attrs: Record<string, string> = Object.create(null);
    const rest = token.slice(name.length + 1).replace(/\/?\s*>$/, '');
    let consumed = 0;
    for (const attr of rest.matchAll(/\s+([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      if (attr.index !== consumed || Object.hasOwn(attrs, attr[1]!)) throw new Error('Atributos XML inválidos');
      attrs[attr[1]!] = decode(attr[2] ?? attr[3] ?? '');
      consumed = attr.index + attr[0].length;
    }
    if (rest.slice(consumed).trim()) throw new Error('Atributos XML inválidos');
    const namespaces = { ...parent.namespaces };
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'xmlns') namespaces[''] = value;
      else if (key.startsWith('xmlns:')) namespaces[key.slice(6)] = value;
    }
    const parts = name.split(':');
    const prefix = parts.length > 1 ? parts[0]! : '';
    if (prefix && !namespaces[prefix]) throw new Error('Namespace XML no declarado');
    const node: Element = {
      name,
      local: parts[parts.length - 1]!,
      ns: namespaces[prefix] ?? '',
      attrs,
      namespaces,
      base: attrs['xml:base'] ? (safeUrl(attrs['xml:base'], parent.base) ?? parent.base) : parent.base,
      children: [],
      text: '',
    };
    parent.children.push(node);
    if (!/\/\s*>$/.test(token)) stack.push(node);
    else if (stack.length > 1) parent.text += `<${node.local}/>`;
    if (stack.length > 64) throw new Error('XML demasiado profundo');
  }
  if (end !== xml.length || stack.length !== 1 || document.children.length !== 1 || document.text.trim()) {
    throw new Error('Documento XML inválido');
  }
  return document.children[0]!;
}

function child(node: Element, local: string, ns = node.ns): Element | undefined {
  return node.children.find((c) => c.local === local && c.ns === ns);
}

/** RSS 2.0, RSS 1.0/RDF y Atom 1.0 de fuentes aprobadas. PLOS admite Atom además de su API JSON.
 * Solo description/summary: content y content:encoded se descartan, sin fallback al artículo.
 * No hace I/O. Un feed roto lanza error; una entrada sin titular/enlace válido se omite.
 */
export function parseNewsFeed(xml: string, sourceId: string): NewsArticle[] {
  const source = sourceFor(sourceId);
  const root = parseXml(xml.replace(/^\uFEFF/, ''), source.endpoint);
  const atom = root.local === 'feed' && root.ns === ATOM;
  const rdf = root.local === 'RDF' && root.ns === RDF;
  const rss = root.local === 'rss' && root.ns === '';
  if (!atom && !rdf && !rss) throw new Error('Formato de feed no admitido');
  const container = rss ? child(root, 'channel') : root;
  if (!container) throw new Error('RSS sin channel');
  const ns = atom ? ATOM : rdf ? RSS : '';
  const items: NewsArticle[] = [];
  for (const entry of container.children.filter((c) => c.local === (atom ? 'entry' : 'item') && c.ns === ns)) {
    const link = atom ? entry.children.find((c) => c.local === 'link' && c.ns === ATOM && (!c.attrs.rel || c.attrs.rel === 'alternate')) : child(entry, 'link');
    const rawUrl = atom ? link?.attrs.href : link?.text.trim();
    const authors = atom
      ? entry.children.filter((c) => c.local === 'author' && c.ns === ATOM).map((c) => child(c, 'name')?.text ?? '')
      : entry.children.filter((c) => c.local === 'creator' && c.ns === DC).map((c) => c.text);
    const item = normalizeNewsItem(
      {
        sourceId,
        title: child(entry, 'title')?.text ?? '',
        url: rawUrl ?? '',
        contentOrSummary: child(entry, atom ? 'summary' : 'description')?.text,
        publishedAt: (atom ? (child(entry, 'published') ?? child(entry, 'updated')) : (child(entry, 'pubDate') ?? child(entry, 'date', DC)))?.text,
        authors,
      },
      link?.base ?? entry.base,
    );
    if (item) items.push(item);
  }
  return deduplicateNews(items);
}
