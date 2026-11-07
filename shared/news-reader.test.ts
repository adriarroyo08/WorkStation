import { describe, expect, it } from 'vitest';
import { filterNews, newsUnavailable, parseNewsResult } from './news-reader';
import type { NewsResult } from './news-collector';

const article = { id: 'a', sourceId: 's', title: 'Fuerza', shortSummary: 'Resumen', url: 'https://example.org/a', publishedAt: '', topics: ['fuerza' as const], language: 'es' as const };
const result: NewsResult = { updatedAt: '2026-11-08T12:00:00Z', items: [article], sources: [{ id: 's', updatedAt: null, stale: false }] };

describe('lectura de noticias', () => {
  it('combina filtros sin modificar la respuesta y admite cualquier fuente del contrato', () => {
    const items = [article, { ...article, id: 'b', sourceId: 'otra', topics: ['nutricion' as const] }, { ...article, id: 'c', topics: ['nutricion' as const] }];
    expect(filterNews(items)).toEqual(items);
    expect(filterNews(items, 's')).toHaveLength(2);
    expect(filterNews(items, '', 'nutricion')).toHaveLength(2);
    expect(filterNews(items, 's', 'nutricion').map((a) => a.id)).toEqual(['c']);
    expect(filterNews(items, 'otra', 'fuerza')).toEqual([]);
    expect(items).toHaveLength(3);
  });
  it('acepta respuestas vacías válidas y fechas desconocidas', () => {
    expect(parseNewsResult(result)).toEqual(result);
    expect(parseNewsResult({ ...result, updatedAt: null, items: [], sources: [] })).toBeDefined();
    expect(parseNewsResult({ ...result, items: [{ ...article, publishedAt: result.updatedAt, authors: ['Autora'], journalOrSource: 'Revista' }] })).toBeDefined();
  });
  it.each([
    null,
    4,
    {},
    { ...result, updatedAt: 'ayer' },
    { ...result, items: {} },
    { ...result, sources: null },
    { ...result, sources: [null] },
    { ...result, sources: [{ id: 's', updatedAt: 'ayer', stale: false }] },
    { ...result, sources: [{ id: 's', updatedAt: null, stale: true, error: 4 }] },
  ])('rechaza respuestas y cachés dañadas: %j', (value) => {
    expect(parseNewsResult(value)).toBeUndefined();
  });
  it.each(['javascript:alert(1)', 'data:text/html,hi', 'https://user:pass@example.org', 'no es una url', 2])('rechaza enlaces peligrosos: %s', (url) => {
    expect(parseNewsResult({ ...result, items: [{ ...article, url }] })).toBeUndefined();
  });
  it.each([null, { ...article, topics: ['inexistente'] }, { ...article, publishedAt: 'ayer' }, { ...article, authors: [42] }, { ...article, journalOrSource: {} }, { ...article, shortSummary: null }])(
    'rechaza artículos inválidos: %j',
    (item) => {
      expect(parseNewsResult({ ...result, items: [item] })).toBeUndefined();
    },
  );
  it('distingue fallo total, parcial y éxito vacío', () => {
    expect(newsUnavailable(result)).toBe(false);
    expect(newsUnavailable({ ...result, items: [] })).toBe(false);
    expect(newsUnavailable({ updatedAt: null, items: [], sources: [{ id: 's', updatedAt: null, stale: true, error: 'No disponible' }] })).toBe(true);
    expect(newsUnavailable({ ...result, sources: [{ id: 's', updatedAt: result.updatedAt, stale: true }] })).toBe(false);
  });
});
