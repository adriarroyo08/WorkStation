import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deduplicateNews, NEWS_SUMMARY_MAX_CHARS, normalizeNewsItem, parseNewsFeed } from './news';
import { NEWS_SOURCE_CANDIDATES } from './news-sources';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/news/${name}.xml`, import.meta.url), 'utf8');
const raw = { sourceId: 'frontiers-sports', title: 'Strength', url: 'https://example.org/article' };
const rss = (entries: string) => `<rss><channel>${entries}</channel></rss>`;
const item = (fields = '') => `<item><title>Title</title><link>https://example.org/article</link>${fields}</item>`;

describe('fixtures sintéticos de fuentes aprobadas', () => {
  it('RSS 2.0: limpia HTML, entidades, duplicados y fechas sin usar el reloj', () => {
    const articles = parseNewsFeed(fixture('frontiers'), 'frontiers-sports');
    expect(articles).toHaveLength(3);
    expect(articles[0]).toMatchObject({
      sourceId: 'frontiers-sports',
      title: 'Strength & recovery 💪',
      url: 'https://www.frontiersin.org/articles/test-strength',
      shortSummary: 'A short synthetic summary & findings.',
      publishedAt: '2026-11-06T12:00:00.000Z',
      authors: ['Researcher & Team'],
      language: 'en',
    });
    expect(articles[0]!.topics).toEqual(NEWS_SOURCE_CANDIDATES.find((s) => s.id === 'frontiers-sports')!.topics);
    expect(articles.slice(1).every((a) => a.publishedAt === '')).toBe(true);
    expect(articles.find((a) => a.title === 'No date')!.shortSummary).toBe('Resumen con ñ y é.');
    expect(JSON.stringify(articles)).not.toContain('FULL_ARTICLE');
    expect(parseNewsFeed(fixture('frontiers'), 'frontiers-sports')).toEqual(articles);
  });

  it('RSS 1.0/RDF: namespaces por URI, Dublin Core y zona horaria', () => {
    expect(parseNewsFeed(fixture('jissn'), 'jissn')).toMatchObject([
      {
        title: 'Protein & strength',
        authors: ['Sample Author'],
        publishedAt: '2026-11-04T13:30:00.000Z',
        shortSummary: 'Short synthetic nutrition findings.',
        sourceId: 'jissn',
      },
    ]);
  });

  it('Atom: prefijos, XHTML, enlaces alternate, xml:base y updated', () => {
    const articles = parseNewsFeed(fixture('plos'), 'plos-one');
    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      title: 'Resistance training',
      url: 'https://journals.plos.org/plosone/article?id=10.test/strength&view=summary',
      shortSummary: 'Short synthetic summary.',
      authors: ['Sample Scientist'],
      publishedAt: '2026-11-05T08:00:00.000Z',
    });
    expect(articles[1]).toMatchObject({ shortSummary: '', publishedAt: '2026-11-03T10:00:00.000Z' });
    expect(JSON.stringify(articles)).not.toContain('FULL_ARTICLE');
    const defaultNamespace = fixture('plos').replaceAll('a:', '').replace('xmlns:a=', 'xmlns=');
    expect(parseNewsFeed(defaultNamespace, 'plos-one')).toEqual(articles);
  });

  it.each([
    ['fisiologia', 'fisiologia-ejercicio'],
    ['stronger', 'stronger-by-science'],
  ])('WordPress %s: solo description', (file, source) => {
    const articles = parseNewsFeed(fixture(file), source);
    expect(articles[0]!.shortSummary.length).toBeGreaterThan(0);
    expect(JSON.stringify(articles)).not.toMatch(/FULL_ARTICLE|NO_SUMMARY_FALLBACK/);
    expect(articles[0]!.publishedAt).toMatch(/T.*Z$/);
  });
});

describe('normalización compartida', () => {
  it('ID estable desde URL canónica; resumen Unicode acotado por catálogo y techo global', () => {
    expect(NEWS_SUMMARY_MAX_CHARS).toBe(280);
    for (const sourceId of ['plos-one', 'fisiologia-ejercicio', 'stronger-by-science', 'jissn']) {
      const source = NEWS_SOURCE_CANDIDATES.find((s) => s.id === sourceId)!;
      const article = normalizeNewsItem({ ...raw, id: 'untrusted-guid', sourceId, contentOrSummary: '💪'.repeat(600) })!;
      const limit = Math.min(source.permits.maxSummaryChars, NEWS_SUMMARY_MAX_CHARS);
      expect(Array.from(article.shortSummary)).toHaveLength(limit);
      expect(article.shortSummary.endsWith('…')).toBe(true);
      expect(article.shortSummary).not.toContain('\uFFFD');
      expect(article.id).toBe(`${sourceId}:${encodeURIComponent(raw.url)}`);
    }
    expect(normalizeNewsItem({ ...raw, contentOrSummary: 'exact' })!.shortSummary).toBe('exact');
  });

  it('no muta temas ni acepta fuentes pendientes, excluidas o desconocidas', () => {
    const article = normalizeNewsItem(raw)!;
    article.topics.length = 0;
    expect(normalizeNewsItem(raw)!.topics.length).toBeGreaterThan(0);
    for (const id of ['vitonica', 'examine', 'unknown']) {
      expect(() => normalizeNewsItem({ ...raw, sourceId: id })).toThrow('Fuente no aprobada');
      expect(() => parseNewsFeed(rss(''), id)).toThrow('Fuente no aprobada');
    }
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///tmp/test',
    'ftp://example.org',
    'https://',
    'https://user:password@example.org',
    'https://example.org/\npath',
    'https://example.org/\\path',
    '',
    '/relative',
  ])('rechaza URL %j', (url) => {
    expect(normalizeNewsItem({ ...raw, url })).toBeUndefined();
  });

  it('resuelve URL relativa solo con base explícita y elimina fragmentos', () => {
    expect(normalizeNewsItem({ ...raw, url: '../article#section' }, 'https://example.org/feed/')!.url).toBe(raw.url);
    expect(normalizeNewsItem({ ...raw, url: ' HTTP://EXAMPLE.ORG:80/article#x ' })!.url).toBe('http://example.org/article');
    expect(normalizeNewsItem({ ...raw, title: '<script>bad()</script>' })).toBeUndefined();
    expect(normalizeNewsItem({ ...raw, contentOrSummary: '<a title="x > y">Text</a> &constructor;' })!.shortSummary).toBe('Text &constructor;');
    expect(normalizeNewsItem({ ...raw, contentOrSummary: '<style>x</style><!--hidden-->&quot;&#39;&apos;&#x41;&#65;&#0;&#xD800;&#x110000;&unknown;' })!.shortSummary).toBe("\"''AA���&unknown;");
  });

  it.each([
    [undefined, ''],
    ['invalid', ''],
    ['2026-02-30', ''],
    ['2026-11-03', '2026-11-03T00:00:00.000Z'],
    ['2026-11-03T12:30:00', '2026-11-03T12:30:00.000Z'],
    ['2026-99-99T00:00:00Z', ''],
    ['2026-02-30T12:00:00Z', ''],
    ['2026-02-29T12:00:00+02:00', ''],
    ['2028-02-29T00:30:00+02:00', '2028-02-28T22:30:00.000Z'],
    ['2026-11-03T24:00:00', ''],
    ['Tue, 03 Nov 2026 12:30:00 GMT', '2026-11-03T12:30:00.000Z'],
  ])('fecha %j se normaliza de manera determinista', (publishedAt, expected) => {
    expect(normalizeNewsItem({ ...raw, publishedAt })!.publishedAt).toBe(expected);
  });

  it('deduplicación y orden no dependen del orden de entrada; no muta el array', () => {
    const a = normalizeNewsItem({ ...raw, title: 'A', publishedAt: '2026-11-03' })!;
    const b = normalizeNewsItem({ ...raw, title: 'B', publishedAt: '2026-11-03' })!;
    const old = normalizeNewsItem({ ...raw, title: 'Old' })!;
    const other = normalizeNewsItem({ ...raw, url: 'https://example.org/z', publishedAt: '2026-11-04' })!;
    const unknown = normalizeNewsItem({ ...raw, url: 'https://example.org/unknown' })!;
    const crossSource = normalizeNewsItem({ ...raw, sourceId: 'jissn', publishedAt: '2026-11-01' })!;
    const input = [old, b, other, unknown, a, crossSource];
    const result = deduplicateNews(input);
    expect(result.map((v) => v.title)).toEqual(['Strength', 'A', 'Strength']);
    expect(deduplicateNews([...input].reverse())).toEqual(result);
    expect(input).toHaveLength(6);
  });
});

describe('XML hostil, inválido y límites', () => {
  it.each(['<!DOCTYPE rss SYSTEM "https://evil.example/xxe">', '<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>', '<!DOCTYPE rss [<!ENTITY a "expanded"><!ENTITY b "&a;&a;">]>'])(
    'rechaza DTD sin resolver ninguna entidad: %s',
    (dtd) => {
      expect(() => parseNewsFeed(`${dtd}${rss(item('<description>&xxe;</description>'))}`, raw.sourceId)).toThrow();
    },
  );

  it.each([
    '',
    '<rss>',
    '<rss></feed>',
    '<rss/><rss/>',
    'text<rss/>',
    '<rss/>trailing',
    '<rss><channel></rss>',
    '<rss><channel a="1" a="2"/></rss>',
    '<rss broken=unquoted/>',
    '<rss broken/>',
    '<rss><unknown:item/></rss>',
    '<rss><!-- unfinished</rss>',
    '<rss><![CDATA[unfinished</rss>',
    '<rss><!ENTITY bad></rss>',
    '<not-feed/>',
    '<rss/>',
  ])('rechaza XML %j', (xml) => {
    expect(() => parseNewsFeed(xml, raw.sourceId)).toThrow();
  });

  it('limita tamaño y profundidad', () => {
    expect(() => parseNewsFeed(' '.repeat(2_000_001), raw.sourceId)).toThrow('demasiado grande');
    expect(() => parseNewsFeed('<rss>'.repeat(65) + '</rss>'.repeat(65), raw.sourceId)).toThrow('demasiado profundo');
  });

  it('feed vacío, BOM, comentarios, instrucciones, atributos y espacios en elementos vacíos', () => {
    expect(parseNewsFeed('\uFEFF<?xml version="1.0"?><!-- x -->' + rss(''), raw.sourceId)).toEqual([]);
    expect(parseNewsFeed("<rss version='2.0'><channel ><item ><title/><link /></item></channel></rss>", raw.sourceId)).toEqual([]);
  });

  it('ignora namespaces ajenos, GUID inseguros y etiquetas que no pertenecen a una entrada', () => {
    const xml =
      '<rss xmlns:evil="urn:evil"><channel><title>Channel</title><evil:item><title>Not an item</title></evil:item>' +
      '<item><evil:title>Injected</evil:title><title>Valid</title><link>https://example.org/</link><guid>javascript:bad()</guid></item>' +
      '<item><title>Missing link</title><guid>https://example.org/guid</guid></item></channel></rss>';
    expect(parseNewsFeed(xml, raw.sourceId)).toMatchObject([{ title: 'Valid', url: 'https://example.org/' }]);
  });

  it('Atom sin enlace alternate no usa self, ni content como sinopsis', () => {
    const xml =
      '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Missing alternate</title><link rel="self" href="https://example.org/self"/></entry>' +
      '<entry xml:base="javascript:bad()"><title>Valid</title><link href="/relative"/><summary type="html">&lt;b&gt;Safe&lt;/b&gt;</summary></entry></feed>';
    expect(parseNewsFeed(xml, 'plos-one')).toMatchObject([{ title: 'Valid', url: 'https://api.plos.org/relative', shortSummary: 'Safe' }]);
  });

  it('conserva separaciones XHTML y elimina scripts anidados', () => {
    const xml =
      '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>XHTML</title><link href="https://example.org/"/>' +
      '<summary><div xmlns="http://www.w3.org/1999/xhtml">Before<br/>after<script>bad()</script></div></summary></entry ></feed>';
    expect(parseNewsFeed(xml, 'plos-one')[0]!.shortSummary).toBe('Before after');
  });
});
