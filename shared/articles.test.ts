import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { buildArticleLibrary, EVIDENCE_LEVELS, parseArticle, parseArticleMarkdown, safeArticleUrl } from './articles';
import { DEFAULT_EXERCISES } from './exercises';
import { ARTICLE_LIBRARY } from './articles.generated';
import { ARTICLE_RESOURCE, readArticleResource } from './article-resource';
import { handleMcp } from './mcp-http';

const ids = new Set(DEFAULT_EXERCISES.map((e) => e.id));
const example = readFileSync(new URL('../content/articulos/volumen-semanal.md', import.meta.url), 'utf8').replace(/\r\n?/g, '\n');
const parse = (text: string) => parseArticle(text, ids);

describe('artículos: contrato editorial', () => {
  it('conserva metadatos, contenido y asociación opcional', () => {
    const article = parse('\uFEFF' + example.replace(/\n/g, '\r\n'));
    expect(article.slug).toBe('volumen-semanal');
    expect(article.sources[0].doi).toBe('10.1080/02640414.2016.1210197');
    expect(article.exercises).toEqual(['press-banca']);
    expect(article.blocks[0].type).toBe('heading');
    expect(parse(example.replace('exercises:\n  - press-banca\n', '')).exercises).toEqual([]);
    expect(parse(example.replace('title: Volumen semanal e hipertrofia', 'title: "Título: con dos puntos"')).title).toBe('Título: con dos puntos');
    expect(parse(example.replace('title: Volumen semanal e hipertrofia', "title: 'Título'")).title).toBe('Título');
    expect(parse(example.replace('date: 2026-11-07', 'date: 2024-02-29')).date).toBe('2024-02-29');
  });

  it.each([
    [example.slice(4), 'delimitador inicial'],
    [example.replace('\n---\n#', '\n#'), 'delimitador final'],
    [example.replace('slug: volumen-semanal', 'slug: Volumen'), 'slug inválido'],
    [example.replace('title: Volumen semanal e hipertrofia', ''), 'falta «title»'],
    [example.replace('title: Volumen semanal e hipertrofia', 'title: '), 'valor vacío'],
    [example.replace('title: Volumen semanal e hipertrofia', 'title: "sin cerrar'), 'comillas sin cerrar'],
    [example.replace('title: Volumen semanal e hipertrofia', 'title: ""'), 'valor vacío'],
    [example.replace('title: Volumen semanal e hipertrofia', 'title: &alias'), 'sintaxis no admitida'],
    [example.replace('title:', 'title= '), 'frontmatter inválido'],
    [example.replace('title:', 'autor:'), 'clave desconocida'],
    [example.replace('title:', 'slug: repetido\ntitle:'), 'clave duplicada'],
    [example.replace('tags:', 'tags: [volumen]'), 'debe ser una lista'],
    [example.replace('  - hipertrofia\n  - volumen', ''), 'al menos un elemento'],
    [example.replace('  - volumen', '  - hipertrofia'), 'duplicados'],
    [example.replace('date: 2026-11-07', 'date: 2025-02-29'), 'fecha inválida'],
    [example.replace('date: 2026-11-07', 'date: 2026-13-01'), 'fecha inválida'],
    [example.replace('date: 2026-11-07', 'date: 07/11/2026'), 'fecha inválida'],
    [example.replace('evidence: metaanalisis', 'evidence: alta'), 'nivel de evidencia inválido'],
    [example.replace('evidence: metaanalisis', 'evidence: ensayo'), 'diseño más fuerte'],
    [example.replace('10.1080/02640414.2016.1210197 |', 'https://doi.org/10.1080/02640414.2016.1210197 |'), 'DOI inválido'],
    [example.replace(' | metaanalisis |', ' | inventado |'), 'nivel de evidencia inválido'],
    [example.replace(' | metaanalisis |', ' | '), 'fuente inválida'],
    [example.replace('press-banca\n', 'no-existe\n'), 'ejercicio desconocido'],
    [example.replace('exercises:\n', 'exercises:\n  - press-banca\n'), 'duplicados'],
    [example.replace('title:', '  - huérfano\ntitle:'), 'sin clave de lista'],
    [example.split('\n---\n')[0] + '\n---\n', 'contenido vacío'],
  ])('rechaza entradas inválidas con contexto: %s', (input, message) => {
    expect(() => parse(input)).toThrow(message);
  });

  it('admite exactamente los cinco niveles y elige el más fuerte de varias fuentes', () => {
    for (const level of EVIDENCE_LEVELS) {
      expect(parse(example.replaceAll('metaanalisis', level)).evidence).toBe(level);
    }
    const mixed = example.replace('sources:\n', 'sources:\n  - 10.1234/otro | observacional | Estudio de ejemplo para validar el contrato\n');
    expect(parse(mixed).sources).toHaveLength(2);
    expect(() => parse(mixed.replace('evidence: metaanalisis', 'evidence: observacional'))).toThrow('diseño más fuerte');
    const source = example.split('\n').find((l) => l.startsWith('  - 10.'))!;
    expect(() => parse(example.replace(source, source + '\n' + source.replace('Schoenfeld', 'Otro título Schoenfeld')))).toThrow('DOI duplicado');
    expect(() => parse(example.replace(source, source.replace('2017', '2017 | extra')))).toThrow('fuente inválida');
  });

  it('genera un índice estable y detecta slugs duplicados y nombres inconsistentes', () => {
    const first = { name: 'volumen-semanal.md', content: example };
    const other = { name: 'otro.md', content: example.replace('slug: volumen-semanal', 'slug: otro') };
    expect(buildArticleLibrary([first, other], ids)).toEqual(buildArticleLibrary([other, first], ids));
    expect(() => buildArticleLibrary([first, first], ids)).toThrow('volumen-semanal.md: Artículo: slug duplicado');
    expect(() => buildArticleLibrary([{ ...first, name: 'otro.md' }], ids)).toThrow('debe llamarse volumen-semanal.md');
    expect(buildArticleLibrary([], ids)).toEqual({ schemaVersion: 1, index: [], articles: [] });
    expect(buildArticleLibrary([first], ids).index[0]).not.toHaveProperty('markdown');
  });

  it('los artefactos incluidos contienen todos los originales actuales y referencias reales', () => {
    const directory = new URL('../content/articulos/', import.meta.url);
    const files = readdirSync(directory)
      .filter((name) => name.endsWith('.md') && name !== 'README.md')
      .map((name) => ({ name, content: readFileSync(new URL(name, directory), 'utf8') }));
    const library = buildArticleLibrary(files, ids);
    expect(library).toEqual(ARTICLE_LIBRARY);
    expect(JSON.parse(readFileSync(new URL('../app/public/articles.json', import.meta.url), 'utf8'))).toEqual(library);
    // Vigila que el extractor del build siga la misma biblioteca que la app.
    const exerciseSource = readFileSync(new URL('./exercises.ts', import.meta.url), 'utf8');
    expect(new Set([...exerciseSource.matchAll(/^\s*\['([^']+)',/gm)].map((m) => m[1]))).toEqual(ids);
  });
});

describe('Markdown como estructura segura', () => {
  it('representa el subconjunto admitido sin generar HTML', () => {
    const blocks = parseArticleMarkdown(
      '# Título\r\n\r\nPárrafo\r\ncontinuado `x` **fuerte** *énfasis* [fuente](https://doi.org/10.1234/x).\n\n- uno\n- dos\n\n1. primero\n2. segundo\n\n> cita\n\n```js\n<script>x()</script>\n```',
    );
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'quote', 'code']);
    expect(blocks[1]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Párrafo\ncontinuado ' },
        { type: 'code', text: 'x' },
        { type: 'text', text: ' ' },
        { type: 'strong', text: 'fuerte' },
        { type: 'text', text: ' ' },
        { type: 'emphasis', text: 'énfasis' },
        { type: 'text', text: ' ' },
        { type: 'link', text: 'fuente', href: 'https://doi.org/10.1234/x' },
        { type: 'text', text: '.' },
      ],
    });
    expect(blocks[2]).toEqual({ type: 'list', ordered: false, items: [[{ type: 'text', text: 'uno' }], [{ type: 'text', text: 'dos' }]] });
    expect(blocks[3]).toMatchObject({ ordered: true });
    expect(blocks[5]).toEqual({ type: 'code', text: '<script>x()</script>' });
    expect(parseArticleMarkdown('```\nsin cerrar')).toEqual([{ type: 'code', text: 'sin cerrar' }]);
    expect(parseArticleMarkdown('### ')).toEqual([{ type: 'heading', level: 3, children: [] }]);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:evil',
    'data:text/html,evil',
    'vbscript:evil',
    '//evil.test',
    '/relative',
    '#anchor',
    'file:///tmp/x',
    'mailto:a@b.c',
    'https://user:password@evil.test',
    'https://evil.test/\u0000x',
    'https://evil.test/a b',
    'https:\\evil.test',
    'https://',
    'https://[invalid',
    'https://evil.test/\u007fx',
  ])('no convierte destinos peligrosos en enlaces: %s', (url) => {
    expect(safeArticleUrl(url)).toBeUndefined();
    const blocks = parseArticleMarkdown(`[clic](${url})`);
    expect(JSON.stringify(blocks)).not.toContain('"type":"link"');
  });

  it('mantiene ataques HTML, entidades e imágenes como texto inerte', () => {
    const attack = '<script>alert(1)</script> <img src=x onerror=alert(2)> &lt;svg onload=alert(3)&gt; ![imagen](https://evil.test/a.png)';
    expect(parseArticleMarkdown(attack)).toEqual([{ type: 'paragraph', children: [{ type: 'text', text: attack }] }]);
    expect(parseArticleMarkdown('[<svg onload=evil>](https://example.org)')).toEqual([{ type: 'paragraph', children: [{ type: 'link', text: '<svg onload=evil>', href: 'https://example.org/' }] }]);
    expect(safeArticleUrl('HTTP://example.org/a')).toBe('http://example.org/a');
  });
});

describe('biblioteca MCP embebida', () => {
  it('lee el mismo contenido sin red y rechaza recursos ajenos', () => {
    expect(JSON.parse(readArticleResource(ARTICLE_RESOURCE.uri).contents[0].text)).toEqual(ARTICLE_LIBRARY);
    expect(() => readArticleResource('https://evil.test')).toThrow('Recurso desconocido');
  });
  it('anuncia y sirve el recurso HTTP sin cargar datos ni consultar terceros', async () => {
    // El transporte crea el origen autenticado, pero los recursos no usan load/save.
    const load = vi.fn(),
      save = vi.fn();
    const source = () => ({ label: 'test', load, save, verifyKey: async () => true });
    const rpc = async (method: string, params = {}) =>
      (
        await handleMcp(
          new Request('https://local.test', {
            method: 'POST',
            headers: { authorization: 'Bearer ws_test' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          }),
          source,
        )
      ).json();
    expect((await rpc('initialize')).result.capabilities.resources).toEqual({ listChanged: false });
    expect((await rpc('resources/list')).result.resources).toEqual([ARTICLE_RESOURCE]);
    expect(JSON.parse((await rpc('resources/read', { uri: ARTICLE_RESOURCE.uri })).result.contents[0].text)).toEqual(ARTICLE_LIBRARY);
    expect((await rpc('resources/read', { uri: 'https://evil.test' })).error.code).toBe(-32002);
    expect((await rpc('resources/read')).error.code).toBe(-32002);
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
