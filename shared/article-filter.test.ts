import { describe, expect, it } from 'vitest';
import { articleSlugFromHash, filterArticles } from './article-filter';
import { ARTICLE_LIBRARY } from './articles.generated';

describe('filtros de artículos', () => {
  it('reconoce solo rutas de artículo con un slug válido', () => {
    expect(articleSlugFromHash('#articles/volumen-semanal')).toBe('volumen-semanal');
    for (const hash of ['', '#articles/', '#articles/../x', '#articles/a%20b', '#articles/A', '#rutina/123']) expect(articleSlugFromHash(hash)).toBeNull();
  });
  const article = ARTICLE_LIBRARY.index[0];
  const other = { ...article, slug: 'otro', title: 'Movilidad', summary: 'Descanso', tags: ['movilidad'], exercises: [] };
  const items = [article, other];
  it('combina palabras sin distinguir acentos ni mayúsculas y todas las etiquetas', () => {
    expect(filterArticles(items, '  HIPERTROFÍA volumen  ', article.tags)).toEqual([article]);
    expect(filterArticles(items, '', [...article.tags, 'inexistente'])).toEqual([]);
    expect(filterArticles(items, 'descanso', ['movilidad'])).toEqual([other]);
  });
  it('limita relaciones a ids explícitos sin modificar el índice', () => {
    expect(filterArticles(items, '', [], 'press-banca')).toEqual([article]);
    expect(filterArticles(items, '', [], 'sin-articulos')).toEqual([]);
    expect(filterArticles(items)).toEqual(items);
    expect(items).toHaveLength(2);
  });
});
