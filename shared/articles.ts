// Contrato editorial offline. Subconjunto deliberadamente pequeño de frontmatter y Markdown.
export const EVIDENCE_LEVELS = ['metaanalisis', 'revision', 'ensayo', 'observacional', 'consenso'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export interface ArticleSource {
  doi: string;
  title: string;
  level: EvidenceLevel;
}
export type ArticleInline = { type: 'text' | 'code' | 'strong' | 'emphasis'; text: string } | { type: 'link'; text: string; href: string };
export type ArticleBlock =
  | { type: 'paragraph' | 'quote'; children: ArticleInline[] }
  | { type: 'heading'; level: number; children: ArticleInline[] }
  | { type: 'list'; ordered: boolean; items: ArticleInline[][] }
  | { type: 'code'; text: string };
export interface Article {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  date: string;
  evidence: EvidenceLevel;
  sources: ArticleSource[];
  exercises: string[];
  markdown: string;
  blocks: ArticleBlock[];
}
export type ArticleSummary = Omit<Article, 'markdown' | 'blocks'>;
export interface ArticleLibrary {
  schemaVersion: 1;
  index: ArticleSummary[];
  articles: Article[];
}

function fail(message: string): never {
  throw new Error(`Artículo: ${message}`);
}
function evidence(value: string): EvidenceLevel {
  if (!EVIDENCE_LEVELS.includes(value as EvidenceLevel)) fail(`nivel de evidencia inválido «${value}»; usa ${EVIDENCE_LEVELS.join(', ')}`);
  return value as EvidenceLevel;
}
function scalar(value: string): string {
  const text = value.trim();
  if (!text) fail('valor vacío');
  if (text.startsWith('"') || text.startsWith("'")) {
    if (text.length < 2 || text.at(-1) !== text[0]) fail('comillas sin cerrar');
    return text.slice(1, -1).trim() || fail('valor vacío');
  }
  if ('[]{}&*!|>'.includes(text[0])) fail('sintaxis no admitida; usa clave: valor y listas con guion');
  return text;
}

/** Solo claves escalares y listas de escalares; sources usa «DOI | nivel | título». */
export function parseArticle(input: string, exerciseIds: ReadonlySet<string>): Article {
  const lines = input
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  if (lines[0] !== '---') fail('falta el delimitador inicial ---');
  const end = lines.indexOf('---', 1);
  if (end < 0) fail('falta el delimitador final ---');
  const fields = new Map<string, string | string[]>();
  const listKeys = ['tags', 'sources', 'exercises'];
  const keys = ['slug', 'title', 'summary', 'date', 'evidence', ...listKeys];
  let current = '';
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue;
    const item = /^ {2}- (.+)$/.exec(line);
    if (item) {
      const list = fields.get(current);
      if (!Array.isArray(list)) fail('elemento de lista sin clave de lista');
      list.push(scalar(item[1]));
      continue;
    }
    const pair = /^([a-z]+):(?: (.*))?$/.exec(line);
    if (!pair) fail(`frontmatter inválido: ${line}`);
    current = pair[1];
    if (!keys.includes(current)) fail(`clave desconocida «${current}»`);
    if (fields.has(current)) fail(`clave duplicada «${current}»`);
    if (listKeys.includes(current)) {
      if (pair[2]?.trim()) fail(`«${current}» debe ser una lista con guion`);
      fields.set(current, []);
    } else fields.set(current, scalar(pair[2] ?? ''));
  }
  const text = (key: string): string => {
    const value = fields.get(key);
    if (typeof value !== 'string') fail(`falta «${key}»`);
    return value;
  };
  const list = (key: string, optional = false): string[] => {
    const value = fields.get(key);
    if (optional && value === undefined) return [];
    if (!Array.isArray(value) || !value.length) fail(`«${key}» requiere al menos un elemento`);
    if (new Set(value).size !== value.length) fail(`elementos duplicados en «${key}»`);
    return value;
  };
  const slug = text('slug');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('slug inválido; usa minúsculas ASCII, números y guiones');
  const date = text('date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail(`fecha inválida «${date}»; usa YYYY-MM-DD real`);
  const level = evidence(text('evidence'));
  const sources = list('sources').map((entry): ArticleSource => {
    const parts = entry.split('|').map((s) => s.trim());
    if (parts.length !== 3 || !parts[2]) fail('fuente inválida; usa DOI | nivel | título');
    if (!/^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i.test(parts[0])) fail(`DOI inválido «${parts[0]}»`);
    return { doi: parts[0].toLowerCase(), level: evidence(parts[1]), title: parts[2] };
  });
  if (new Set(sources.map((s) => s.doi)).size !== sources.length) fail('DOI duplicado en fuentes');
  const strongest = EVIDENCE_LEVELS.find((candidate) => sources.some((s) => s.level === candidate));
  if (level !== strongest) fail(`evidence debe ser «${strongest}», el diseño más fuerte de las fuentes`);
  const exercises = list('exercises', true);
  for (const id of exercises) if (!exerciseIds.has(id)) fail(`referencia a ejercicio desconocido «${id}»`);
  const markdown = lines
    .slice(end + 1)
    .join('\n')
    .trim();
  if (!markdown) fail('contenido vacío');
  return { slug, title: text('title'), summary: text('summary'), tags: list('tags'), date, evidence: level, sources, exercises, markdown, blocks: parseArticleMarkdown(markdown) };
}

/** Construye en orden estable; nunca depende del reloj ni consulta fuentes externas. */
export function buildArticleLibrary(files: { name: string; content: string }[], exerciseIds: ReadonlySet<string>): ArticleLibrary {
  const slugs = new Set<string>();
  const articles = files
    .map(({ name, content }) => {
      try {
        const article = parseArticle(content, exerciseIds);
        if (slugs.has(article.slug)) fail(`slug duplicado «${article.slug}»`);
        slugs.add(article.slug);
        if (name !== `${article.slug}.md`) fail(`el fichero debe llamarse ${article.slug}.md`);
        return article;
      } catch (error) {
        throw new Error(`${name}: ${(error as Error).message}`, { cause: error });
      }
    })
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return { schemaVersion: 1, index: articles.map(({ markdown: _markdown, blocks: _blocks, ...metadata }) => metadata), articles };
}

export function safeArticleUrl(value: string): string | undefined {
  if (!/^https?:\/\//i.test(value) || /[\s\\]/.test(value) || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return undefined;
  try {
    const url = new URL(value);
    return url.hostname && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function inline(text: string): ArticleInline[] {
  // Nada se interpreta como HTML, entidades, imágenes, autolinks o enlaces de referencia.
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|(?<!!)\[([^\]]+)\]\(([^\s]+)\)/g;
  const nodes: ArticleInline[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > offset) nodes.push({ type: 'text', text: text.slice(offset, match.index) });
    if (match[1]) nodes.push({ type: 'code', text: match[1] });
    else if (match[2]) nodes.push({ type: 'strong', text: match[2] });
    else if (match[3]) nodes.push({ type: 'emphasis', text: match[3] });
    else {
      const href = safeArticleUrl(match[5]);
      nodes.push(href ? { type: 'link', text: match[4], href } : { type: 'text', text: match[4] });
    }
    offset = match.index + match[0].length;
  }
  if (offset < text.length) nodes.push({ type: 'text', text: text.slice(offset) });
  return nodes;
}

/** AST cerrado para crear nodos de texto/elementos, nunca HTML para inyectar. */
export function parseArticleMarkdown(markdown: string): ArticleBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ArticleBlock[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i++];
    if (!line.trim()) continue;
    if (line.startsWith('```')) {
      const code: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push({ type: 'code', text: code.join('\n') });
    } else if (/^#{1,6} /.test(line)) {
      const heading = /^(#{1,6}) (.*)$/.exec(line)!;
      blocks.push({ type: 'heading', level: heading[1].length, children: inline(heading[2]) });
    } else if (/^(?:- |\d+\. )/.test(line)) {
      const ordered = /^\d/.test(line);
      const pattern = ordered ? /^\d+\. / : /^- /;
      const items = [inline(line.replace(pattern, ''))];
      while (i < lines.length && pattern.test(lines[i])) items.push(inline(lines[i++].replace(pattern, '')));
      blocks.push({ type: 'list', ordered, items });
    } else if (line.startsWith('> ')) blocks.push({ type: 'quote', children: inline(line.slice(2)) });
    else {
      const paragraph = [line];
      while (i < lines.length && lines[i].trim() && !/^(?:#{1,6} |```|- |\d+\. |> )/.test(lines[i])) paragraph.push(lines[i++]);
      blocks.push({ type: 'paragraph', children: inline(paragraph.join('\n')) });
    }
  }
  return blocks;
}
