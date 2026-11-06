import { describe, expect, it } from 'vitest';
import {
  getInitialApprovedSources,
  getNewsSourcesByLanguage,
  getNewsSourcesByStatus,
  NEWS_SOURCE_CANDIDATES,
  parsePlosDocItem,
  parsePubMedSummaryItem,
  SAMPLE_NEWS_FIXTURES,
  sanitizeNewsSnippet,
  stripHtml,
  validateNewsCandidate,
} from './news-sources';

describe('módulo de fuentes abiertas de noticias (shared/news-sources)', () => {
  it('contiene candidatos suficientes auditados con fechas reales', () => {
    expect(NEWS_SOURCE_CANDIDATES.length).toBeGreaterThanOrEqual(10);
    for (const c of NEWS_SOURCE_CANDIDATES) {
      expect(c.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.endpoint).toMatch(/^https?:\/\//);
      expect(c.termsUrl).toMatch(/^https?:\/\//);
      expect(c.topics.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('todos los candidatos del catálogo superan validateNewsCandidate', () => {
    for (const c of NEWS_SOURCE_CANDIDATES) {
      const res = validateNewsCandidate(c);
      expect(res.valid, `Candidato ${c.id} inválido: ${res.errors.join(', ')}`).toBe(true);
      expect(res.errors).toHaveLength(0);
    }
  });

  it('detecta errores al validar un candidato mal configurado', () => {
    const invalidCandidate = {
      ...NEWS_SOURCE_CANDIDATES[0]!,
      endpoint: 'no-es-url',
      termsUrl: '',
      checkedAt: 'fecha-erronea',
      topics: [],
    };
    const res = validateNewsCandidate(invalidCandidate);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('audita PubMed E-utilities con requisitos de tool, email y metadatos públicos', () => {
    const pubmed = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'pubmed-eutils');
    expect(pubmed).toBeDefined();
    expect(pubmed?.status).toBe('aprobada');
    expect(pubmed?.isInitialSelection).toBe(true);
    expect(pubmed?.licenseType).toBe('public-domain');
    expect(pubmed?.authAndQuotas).toContain('tool y email');
    expect(pubmed?.permits.title).toBe(true);
    expect(pubmed?.permits.shortSummary).toBe(true);
    expect(pubmed?.permits.canonicalLink).toBe(true);
  });

  it('audita blogs públicos diferenciando acceso de permiso de reutilización', () => {
    const sbs = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'stronger-by-science');
    expect(sbs).toBeDefined();
    expect(sbs?.licenseType).toBe('all-rights-reserved');
    expect(sbs?.notes).toContain('content:encoded');
    expect(sbs?.permits.maxSummaryChars).toBeLessThanOrEqual(280);

    const chicharro = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'fisiologia-ejercicio');
    expect(chicharro).toBeDefined();
    expect(chicharro?.language).toBe('es');
    expect(chicharro?.status).toBe('aprobada');
    expect(chicharro?.licenseType).toBe('all-rights-reserved');
  });

  it('clasifica fuentes pendientes o excluidas con causas técnicas o legales justificadas', () => {
    const springer = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'springer-bmc');
    expect(springer?.status).toBe('excluida');
    expect(springer?.statusReason).toContain('cookie');

    const examine = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'examine');
    expect(examine?.status).toBe('excluida');

    const menno = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'menno-henselmans');
    expect(menno?.status).toBe('excluida');
    expect(menno?.statusReason).toContain('Cloudflare');

    const vitonica = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'vitonica');
    expect(vitonica?.status).toBe('pendiente');

    const europePmc = NEWS_SOURCE_CANDIDATES.find((c) => c.id === 'europe-pmc');
    expect(europePmc?.status).toBe('pendiente');
  });

  it('filtra candidatos por estado e idioma correctamente', () => {
    const aprobadas = getNewsSourcesByStatus('aprobada');
    expect(aprobadas.length).toBeGreaterThanOrEqual(5);
    for (const a of aprobadas) expect(a.status).toBe('aprobada');

    const pendientes = getNewsSourcesByStatus('pendiente');
    expect(pendientes.length).toBeGreaterThanOrEqual(1);

    const excluidas = getNewsSourcesByStatus('excluida');
    expect(excluidas.length).toBeGreaterThanOrEqual(2);

    const enEspanol = getNewsSourcesByLanguage('es');
    expect(enEspanol.some((s) => s.id === 'fisiologia-ejercicio')).toBe(true);

    const iniciales = getInitialApprovedSources();
    expect(iniciales.length).toBeGreaterThanOrEqual(5);
    for (const init of iniciales) {
      expect(init.isInitialSelection).toBe(true);
      expect(init.status).toBe('aprobada');
    }
  });

  it('stripHtml elimina scripts, estilos y etiquetas conservando el texto limpio', () => {
    const dirty = '<p>Texto con <script>alert("xss")</script> y <b>negrita</b> &amp; enlace <a href="http://x">aquí</a>.</p>';
    expect(stripHtml(dirty)).toBe('Texto con y negrita & enlace aquí.');
    expect(stripHtml('')).toBe('');
  });

  it('sanitizeNewsSnippet recorta extractos y garantiza nunca copiar artículos completos', () => {
    const longText = 'A'.repeat(500);
    const snippet = sanitizeNewsSnippet({
      sourceId: 'stronger-by-science',
      title: '<b>Gran estudio sobre hipertrofia</b>',
      contentOrSummary: `<p>${longText}</p>`,
      url: 'https://www.strongerbyscience.com/hypertrophy-study/',
      publishedAt: '2026-11-03T10:00:00Z',
    }, 150);

    expect(snippet.title).toBe('Gran estudio sobre hipertrofia');
    expect(snippet.shortSummary.length).toBeLessThanOrEqual(150);
    expect(snippet.shortSummary.endsWith('…')).toBe(true);
    expect(snippet.url).toBe('https://www.strongerbyscience.com/hypertrophy-study/');
    expect(snippet.sourceId).toBe('stronger-by-science');
  });

  it('sanitizeNewsSnippet rechaza titulares o URLs inválidas', () => {
    expect(() =>
      sanitizeNewsSnippet({
        sourceId: 'test',
        title: '   ',
        url: 'https://example.com',
      }),
    ).toThrow('El titular limpio no puede estar vacío');

    expect(() =>
      sanitizeNewsSnippet({
        sourceId: 'test',
        title: 'Título válido',
        url: 'javascript:alert(1)',
      }),
    ).toThrow('La URL canónica debe ser válida');
  });

  it('parsePubMedSummaryItem procesa respuestas reales de E-utilities', () => {
    const raw = SAMPLE_NEWS_FIXTURES.pubmedEsummaryJson.result['42366542'];
    const item = parsePubMedSummaryItem('42366542', raw);
    expect(item.id).toBe('pubmed:42366542');
    expect(item.title).toContain('blood flow restriction');
    expect(item.doi).toBe('10.1080/07853890.2026.2658885');
    expect(item.url).toBe('https://pubmed.ncbi.nlm.nih.gov/42366542/');
    expect(item.authors).toEqual(['Xu Q', 'Wang Y', 'Ma D']);
    expect(item.shortSummary).toContain('Autores: Xu Q, Wang Y, Ma D');
  });

  it('parsePlosDocItem procesa elementos de búsqueda de PLOS ONE', () => {
    const doc = SAMPLE_NEWS_FIXTURES.plosSearchJson.response.docs[0]!;
    const item = parsePlosDocItem(doc);
    expect(item.id).toBe('plos:10.1371/journal.pone.0298711');
    expect(item.title).toContain('Neuromuscular fatigue');
    expect(item.url).toBe('https://doi.org/10.1371/journal.pone.0298711');
    expect(item.shortSummary.length).toBeLessThanOrEqual(280);
    expect(item.authors).toContain('García-Pérez D');
  });

  it('las fixtures de muestra contienen XML representativo sin artículos enteros', () => {
    expect(SAMPLE_NEWS_FIXTURES.frontiersRssXml).toContain('<rss version="2.0">');
    expect(SAMPLE_NEWS_FIXTURES.frontiersRssXml).toContain('Frontiers in Sports');
    expect(SAMPLE_NEWS_FIXTURES.fisiologiaRssXml).toContain('Fisiología del Ejercicio');
    expect(SAMPLE_NEWS_FIXTURES.fisiologiaRssXml).toContain('Creatina y beta-alanina');
    expect(SAMPLE_NEWS_FIXTURES.jissnRdfXml).toContain('rdf:RDF');
    expect(SAMPLE_NEWS_FIXTURES.jissnRdfXml).toContain('Journal of the International Society of Sports Nutrition');
  });
});
