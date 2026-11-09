import { describe, expect, it, vi } from 'vitest';
import type { Article, ArticleLibrary } from './articles';
import { articleCitationParts, articleHref, coachArticleContext, getArticle, searchArticles } from './article-search';
import { callTool, TOOLS, toolAnnotations } from './mcp-tools';
import { handleMcp } from './mcp-http';

const article = (slug: string, title: string, markdown = 'Contenido sintético.'): Article => ({
  slug,
  title,
  markdown,
  summary: `Resumen de ${title}`,
  tags: ['fuerza'],
  date: '2026-11-08',
  evidence: 'ensayo',
  sources: [{ doi: '10.1234/test', title: 'Fuente sintética', level: 'ensayo' }],
  exercises: ['press-banca'],
  blocks: [],
});
const library: ArticleLibrary = {
  schemaVersion: 1,
  index: [],
  articles: [article('zeta', 'Volumen semanal'), article('alfa', 'Técnica de sentadilla'), article('beta', 'Recuperación', 'El volumen semanal requiere descanso.')],
};

describe('búsqueda y referencias con corpus sintético', () => {
  it('normaliza acentos, mayúsculas y puntuación; prioriza título frente a cuerpo', () => {
    expect(searchArticles('¡TÉCNICA!', 5, library).map((a) => a.id)).toEqual(['alfa']);
    expect(searchArticles('volumen', 5, library).map((a) => a.id)).toEqual(['zeta', 'beta']);
    expect(searchArticles('volumen volumen', 5, library)).toEqual(searchArticles('volumen', 5, library));
  });
  it('busca etiquetas y ejercicios, limita resultados y desempata por id', () => {
    expect(searchArticles('fuerza', 2, library).map((a) => a.id)).toEqual(['alfa', 'beta']);
    expect(searchArticles('press-banca', 5, library)).toHaveLength(3);
    expect(searchArticles('volumen', 0, library)).toEqual([]);
    expect(searchArticles('volumen', NaN, library)).toEqual([]);
  });
  it('no devuelve referencias con consulta vacía, palabras vacías o sin coincidencias', () => {
    for (const query of ['', '¿qué me recomiendas?', 'astronomía', 'el de y']) expect(searchArticles(query, 5, library)).toEqual([]);
    expect(searchArticles('volumen', 5, { ...library, articles: [] })).toEqual([]);
    expect(getArticle('inexistente', library)).toBeUndefined();
  });
  it('conserva contenido, evidencia, DOI e id estable sin datos del usuario', () => {
    const result = getArticle('alfa', library)!;
    expect(result).toMatchObject({ id: 'alfa', slug: 'alfa', href: '#articles/alfa', evidence: 'ensayo', markdown: 'Contenido sintético.', sources: library.articles[1].sources });
    expect(searchArticles('técnica', 5, library)[0]).not.toHaveProperty('markdown');
    expect(articleHref('a/b ?')).toBe('#articles/a%2Fb%20%3F');
    expect(JSON.stringify(result)).not.toMatch(/workouts|measurements|apiKey/);
  });
  it('entrega al Coach únicamente contenido seleccionado y restringe las citas a esa respuesta', () => {
    const context = coachArticleContext('técnica', library);
    expect(context.articles.map((a) => a.id)).toEqual(['alfa']);
    expect(context.prompt).toContain('Contenido sintético.');
    expect(context.prompt).not.toContain('zeta');
    expect(context.prompt).toContain('No inventes');
    expect(coachArticleContext('astronomía', library).articles).toEqual([]);
    expect(articleCitationParts('Lee [articulo:alfa], [articulo:zeta] y [articulo:inventado].', context.articles)).toEqual([
      { text: 'Lee ' },
      { text: 'Técnica de sentadilla', href: '#articles/alfa' },
      { text: ', ' },
      { text: '' },
      { text: ' y ' },
      { text: '' },
      { text: '.' },
    ]);
    expect(articleCitationParts('[articulo:alfa]', [])).toEqual([{ text: '' }, { text: '' }, { text: '' }]);
  });
});

describe('herramientas de artículos en ambos transportes', () => {
  const src = {
    label: 'sin datos personales',
    load: vi.fn(async () => {
      throw new Error('No leer datos personales');
    }),
    save: vi.fn(async () => {
      throw new Error('No escribir');
    }),
  };
  it('registra herramientas de solo lectura, devuelve referencias válidas y rechaza ids desconocidos', async () => {
    for (const name of ['search_articles', 'get_article']) expect(toolAnnotations(TOOLS.find((t) => t.name === name)!)).toEqual({ readOnlyHint: true });
    const result = await callTool(src, 'search_articles', { query: 'volumen' });
    const matches = JSON.parse(result.text);
    expect(matches.length).toBeGreaterThan(0);
    const detail = await callTool(src, 'get_article', { id: matches[0].id });
    expect(JSON.parse(detail.text)).toMatchObject({ id: matches[0].id, href: matches[0].href, sources: matches[0].sources });
    expect(JSON.parse(detail.text).markdown).toBeTruthy();
    expect((await callTool(src, 'get_article', { id: 'inexistente' })).isError).toBe(true);
    for (const args of [{ query: '' }, { query: 'volumen', limit: 0 }, { query: 'volumen', limit: 21 }]) expect((await callTool(src, 'search_articles', args)).isError).toBe(true);
    expect((await callTool(src, 'search_articles', { query: 'xyzxyzxyz' })).text).toBe('[]');
    expect(src.load).not.toHaveBeenCalled();
    expect(src.save).not.toHaveBeenCalled();
  });
  it('expone búsqueda y consulta por el manejador HTTP usado en edge sin acceder a datos privados', async () => {
    const post = async (method: string, params: unknown) =>
      (
        await handleMcp(
          new Request('https://example.test/mcp', {
            method: 'POST',
            headers: { authorization: 'Bearer ws_test', 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          }),
          () => ({ ...src, verifyKey: async () => true }),
        )
      ).json();
    const listing = await post('tools/list', {});
    expect(listing.result.tools.map((t: { name: string }) => t.name)).toEqual(expect.arrayContaining(['search_articles', 'get_article']));
    const response = await post('tools/call', { name: 'search_articles', arguments: { query: 'volumen', limit: 1 } });
    const matches = JSON.parse(response.result.content[0].text);
    const detail = await post('tools/call', { name: 'get_article', arguments: { id: matches[0].id } });
    expect(JSON.parse(detail.result.content[0].text).id).toBe(matches[0].id);
    expect((await post('tools/call', { name: 'get_article', arguments: { id: 'inexistente' } })).result.isError).toBe(true);
    expect(src.load).not.toHaveBeenCalled();
  });
});
