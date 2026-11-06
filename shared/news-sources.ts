// Contratos, catálogo auditado y sanitizador de fuentes abiertas de noticias científicas.
// Cumple los criterios de la issue #58 y sienta la base del recolector en la épica #36.

export type NewsSourceFormat = 'rss-2.0' | 'atom-1.0' | 'rss-1.0' | 'json-rest';
export type NewsLanguage = 'es' | 'en' | 'mul';
export type NewsSourceStatus = 'aprobada' | 'pendiente' | 'excluida';
export type NewsLicenseType = 'public-domain' | 'cc-by' | 'all-rights-reserved' | 'proprietary';

export type NewsTopic =
  | 'fuerza'
  | 'hipertrofia'
  | 'nutricion'
  | 'fisiologia'
  | 'biomecanica'
  | 'recuperacion'
  | 'general';

export interface NewsPermissions {
  /** Admite mostrar el titular de la noticia o artículo */
  title: boolean;
  /** Admite mostrar un resumen o extracto breve (snippet) */
  shortSummary: boolean;
  /** Admite incluir el enlace canónico directo al sitio de origen */
  canonicalLink: boolean;
  /** Longitud máxima recomendada para el extracto (evita volcar artículos completos) */
  maxSummaryChars: number;
  /** Obligatoriedad de citar expresamente a los autores y a la fuente original */
  requiresAttribution: boolean;
}

export interface NewsSourceCandidate {
  id: string;
  name: string;
  organization: string;
  endpoint: string;
  format: NewsSourceFormat;
  language: NewsLanguage;
  topics: NewsTopic[];
  updateFrequency: string;
  authAndQuotas: string;
  license: string;
  licenseType: NewsLicenseType;
  termsUrl: string;
  checkedAt: string; // Fecha de comprobación YYYY-MM-DD
  permits: NewsPermissions;
  status: NewsSourceStatus;
  statusReason: string;
  isInitialSelection: boolean;
  notes?: string;
}

export interface NewsArticleSnippet {
  id: string;
  sourceId: string;
  title: string;
  shortSummary: string;
  url: string;
  publishedAt: string; // ISO 8601 o fecha de publicación normalizada
  authors?: string[];
  doi?: string;
  journalOrSource?: string;
  language: NewsLanguage;
}

export interface RawNewsItemInput {
  id?: string;
  sourceId: string;
  title: string;
  contentOrSummary?: string;
  url: string;
  publishedAt?: string;
  authors?: string[];
  doi?: string;
  journalOrSource?: string;
  language?: NewsLanguage;
}

/** Catálogo de candidatos auditados con condiciones reales y verificadas el 2026-11-03. */
export const NEWS_SOURCE_CANDIDATES: NewsSourceCandidate[] = [
  {
    id: 'pubmed-eutils',
    name: 'PubMed E-utilities (NCBI / NLM)',
    organization: 'National Center for Biotechnology Information / National Library of Medicine (NIH, EE. UU.)',
    endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
    format: 'json-rest',
    language: 'en',
    topics: ['fuerza', 'hipertrofia', 'fisiologia', 'biomecanica', 'nutricion'],
    updateFrequency: 'Diaria / Continua',
    authAndQuotas: 'Sin clave: 3 req/s por IP. Con API key gratuita: 10 req/s. Parámetros tool y email obligatorios.',
    license: 'Dominio Público en EE. UU. (17 U.S.C. § 105) para metadatos NLM. Abstracts con copyright de editoriales.',
    licenseType: 'public-domain',
    termsUrl: 'https://www.nlm.nih.gov/databases/download/terms_and_conditions.html',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 280,
      requiresAttribution: true,
    },
    status: 'aprobada',
    statusReason: 'Metadatos públicos y de máxima autoridad médica; el resumen debe ser un extracto breve.',
    isInitialSelection: true,
    notes: 'Las peticiones deben incluir tool=WorkStation y email=dev@workstation.app.',
  },
  {
    id: 'plos-one',
    name: 'PLOS ONE Search API & Atom',
    organization: 'Public Library of Science (PLOS)',
    endpoint: 'https://api.plos.org/search',
    format: 'json-rest',
    language: 'en',
    topics: ['fuerza', 'fisiologia', 'biomecanica', 'nutricion'],
    updateFrequency: 'Semanal / Continua',
    authAndQuotas: 'Acceso abierto sin token ni registro. Uso razonable (< 10 req/s).',
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licenseType: 'cc-by',
    termsUrl: 'https://plos.org/open-science/open-access/',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 500,
      requiresAttribution: true,
    },
    status: 'aprobada',
    statusReason: 'Licencia abierta completa CC BY que ampara uso y redistribución con cita.',
    isInitialSelection: true,
  },
  {
    id: 'frontiers-sports',
    name: 'Frontiers in Sports and Active Living',
    organization: 'Frontiers Media SA',
    endpoint: 'https://www.frontiersin.org/journals/sports-and-active-living/rss',
    format: 'rss-2.0',
    language: 'en',
    topics: ['fuerza', 'biomecanica', 'fisiologia', 'recuperacion'],
    updateFrequency: 'Continua (múltiples artículos por semana)',
    authAndQuotas: 'Pública sin clave ni registro. TTL de caché en feed = 60 minutos.',
    license: 'Metadatos CC0; Artículos Creative Commons Attribution 4.0 (CC BY 4.0)',
    licenseType: 'cc-by',
    termsUrl: 'https://www.frontiersin.org/about/terms-and-conditions',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 300,
      requiresAttribution: true,
    },
    status: 'aprobada',
    statusReason: 'Revista de referencia en ciencias del deporte con feed RSS operativo y metadatos CC0.',
    isInitialSelection: true,
  },
  {
    id: 'jissn',
    name: 'Journal of the International Society of Sports Nutrition (JISSN)',
    organization: 'International Society of Sports Nutrition / Taylor & Francis',
    endpoint: 'https://www.tandfonline.com/feed/rss/rssn20',
    format: 'rss-1.0',
    language: 'en',
    topics: ['nutricion', 'hipertrofia', 'fuerza', 'recuperacion'],
    updateFrequency: 'Mensual / Continua',
    authAndQuotas: 'Feed público RSS 1.0 (RDF/XML) sin autenticación.',
    license: 'Open Access Gold (CC BY 4.0 para artículos; metadatos abiertos)',
    licenseType: 'cc-by',
    termsUrl: 'https://www.tandfonline.com/action/journalInformation?journalCode=rssn20',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 280,
      requiresAttribution: true,
    },
    status: 'aprobada',
    statusReason: 'Revista cumbre de nutrición y suplementación deportiva, publicada en Open Access.',
    isInitialSelection: true,
  },
  {
    id: 'fisiologia-ejercicio',
    name: 'Fisiología del Ejercicio (Blog Dr. Chicharro)',
    organization: 'Grupo de Investigación en Fisiología del Ejercicio / Dr. José López Chicharro',
    endpoint: 'https://www.fisiologiadelejercicio.com/feed/',
    format: 'rss-2.0',
    language: 'es',
    topics: ['fisiologia', 'fuerza', 'hipertrofia', 'nutricion', 'recuperacion'],
    updateFrequency: 'Diaria en días laborables',
    authAndQuotas: 'Feed RSS público WordPress sin clave.',
    license: 'Todos los derechos reservados (Copyright © Dr. José López Chicharro)',
    licenseType: 'all-rights-reserved',
    termsUrl: 'https://www.fisiologiadelejercicio.com/aviso-legal/',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 250,
      requiresAttribution: true,
    },
    status: 'aprobada',
    statusReason: 'Fuente rigurosa en español. Se admite sindicación de titular, extracto breve y enlace; prohibido copiar artículo completo.',
    isInitialSelection: true,
    notes: 'No volcar content:encoded. Usar únicamente el extracto de description recortado.',
  },
  {
    id: 'stronger-by-science',
    name: 'Stronger by Science',
    organization: 'Stronger by Science LLC (Greg Nuckols / Eric Trexler)',
    endpoint: 'https://www.strongerbyscience.com/feed/',
    format: 'rss-2.0',
    language: 'en',
    topics: ['fuerza', 'hipertrofia', 'biomecanica', 'nutricion'],
    updateFrequency: 'Semanal / Quincenal',
    authAndQuotas: 'Feed RSS público WordPress cacheado en Cloudflare.',
    license: 'Todos los derechos reservados (Copyright © Stronger by Science LLC)',
    licenseType: 'all-rights-reserved',
    termsUrl: 'https://www.strongerbyscience.com/terms-and-conditions/',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 250,
      requiresAttribution: true,
    },
    status: 'aprobada',
    statusReason: 'Referente internacional de análisis crítico de literatura. Permitida sindicación estándar de titular + excerpt + enlace.',
    isInitialSelection: true,
    notes: 'El feed contiene el artículo entero en content:encoded; debe descartarse de forma estricta.',
  },
  {
    id: 'crossref-api',
    name: 'Crossref Metadata REST API',
    organization: 'Publishers International Linking Association (PILA / Crossref)',
    endpoint: 'https://api.crossref.org/works',
    format: 'json-rest',
    language: 'mul',
    topics: ['general', 'fuerza', 'hipertrofia', 'fisiologia'],
    updateFrequency: 'Continua',
    authAndQuotas: 'Público: 1-5 req/s. Pool Polite: 3-10 req/s mediante cabecera User-Agent con mailto.',
    license: 'Metadatos bibliográficos CC0 1.0 Universal (Dominio Público)',
    licenseType: 'public-domain',
    termsUrl: 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 300,
      requiresAttribution: true,
    },
    status: 'aprobada',
    statusReason: 'Metadatos universales CC0 ideales para resolución de DOI y citas normalizadas.',
    isInitialSelection: true,
  },
  {
    id: 'vitonica',
    name: 'Vitónica',
    organization: 'Webedia Brand Services SL (España)',
    endpoint: 'https://www.vitonica.com/feedburner.xml',
    format: 'rss-2.0',
    language: 'es',
    topics: ['general', 'nutricion', 'fuerza'],
    updateFrequency: 'Diaria (múltiples artículos/día)',
    authAndQuotas: 'Feed público sindicado a través de CloudFront.',
    license: 'Todos los derechos reservados (Copyright © Webedia)',
    licenseType: 'all-rights-reserved',
    termsUrl: 'https://www.vitonica.com/aviso-legal',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 200,
      requiresAttribution: true,
    },
    status: 'pendiente',
    statusReason: 'Términos de Webedia prohíben explícitamente el uso comercial sin contrato. Se reserva para uso personal no comercial.',
    isInitialSelection: false,
  },
  {
    id: 'europe-pmc',
    name: 'Europe PMC REST API',
    organization: 'EMBL-EBI / Consorcio Europe PMC',
    endpoint: 'https://europepmc.org/RestWebService/v1/search',
    format: 'json-rest',
    language: 'en',
    topics: ['fisiologia', 'fuerza', 'nutricion'],
    updateFrequency: 'Continua',
    authAndQuotas: '10 req/s. Actualmente bloqueado por Cloudflare Managed Challenge en centros de datos.',
    license: 'Metadatos abiertos y preprints',
    licenseType: 'cc-by',
    termsUrl: 'https://europepmc.org/TermsOfUse',
    checkedAt: '2026-11-03',
    permits: {
      title: true,
      shortSummary: true,
      canonicalLink: true,
      maxSummaryChars: 300,
      requiresAttribution: true,
    },
    status: 'pendiente',
    statusReason: 'Bloqueo técnico de WAF Cloudflare en consultas de backend automáticas. Requiere proxy o resolución de cabeceras.',
    isInitialSelection: false,
  },
  {
    id: 'springer-bmc',
    name: 'SpringerLink / BMC Sports Science (Direct RSS)',
    organization: 'Springer Nature',
    endpoint: 'https://link.springer.com/search.rss?facet-content-type=Article&facet-journal-id=13102',
    format: 'rss-2.0',
    language: 'en',
    topics: ['fisiologia', 'recuperacion', 'biomecanica'],
    updateFrequency: 'Continua',
    authAndQuotas: 'Requiere cookie interactiva de autorización IDP (HTTP 303 Redirect).',
    license: 'Artículos CC BY 4.0; endpoint protegido por autenticación',
    licenseType: 'proprietary',
    termsUrl: 'https://www.springernature.com/gp/legal/terms-of-use',
    checkedAt: '2026-11-03',
    permits: {
      title: false,
      shortSummary: false,
      canonicalLink: false,
      maxSummaryChars: 0,
      requiresAttribution: true,
    },
    status: 'excluida',
    statusReason: 'Inviable técnicamente para Edge Functions: el endpoint redirige a login/cookie interactiva.',
    isInitialSelection: false,
  },
  {
    id: 'examine',
    name: 'Examine.com',
    organization: 'Examine Inc.',
    endpoint: 'https://examine.com',
    format: 'json-rest',
    language: 'en',
    topics: ['nutricion', 'hipertrofia'],
    updateFrequency: 'N/A',
    authAndQuotas: 'Sin feed RSS público ni API abierta disponible.',
    license: 'Todos los derechos reservados; base de datos cerrada bajo suscripción de pago (Examine+).',
    licenseType: 'proprietary',
    termsUrl: 'https://examine.com/terms/',
    checkedAt: '2026-11-03',
    permits: {
      title: false,
      shortSummary: false,
      canonicalLink: false,
      maxSummaryChars: 0,
      requiresAttribution: true,
    },
    status: 'excluida',
    statusReason: 'No ofrece sindicación pública ni API abierta; contenido bajo muro de pago.',
    isInitialSelection: false,
  },
  {
    id: 'menno-henselmans',
    name: 'Menno Henselmans Blog Feed',
    organization: 'MennoHenselmans.com',
    endpoint: 'https://mennohenselmans.com/feed/',
    format: 'rss-2.0',
    language: 'en',
    topics: ['hipertrofia', 'fuerza', 'nutricion'],
    updateFrequency: 'Semanal',
    authAndQuotas: 'Bloqueado por Cloudflare Bot Management (HTTP 403 con cookie __cf_bm).',
    license: 'Todos los derechos reservados',
    licenseType: 'all-rights-reserved',
    termsUrl: 'https://mennohenselmans.com',
    checkedAt: '2026-11-03',
    permits: {
      title: false,
      shortSummary: false,
      canonicalLink: false,
      maxSummaryChars: 0,
      requiresAttribution: true,
    },
    status: 'excluida',
    statusReason: 'WAF de Cloudflare bloquea activamente peticiones automáticas de servidor con HTTP 403.',
    isInitialSelection: false,
  },
];

/** Elimina etiquetas HTML y decodifica entidades básicas para no almacenar marcado innecesario. */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valida que un candidato a fuente de noticias cumpla todas las reglas estructurales y legales. */
export function validateNewsCandidate(candidate: NewsSourceCandidate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!candidate.id || candidate.id.trim().length === 0) errors.push('El campo id es obligatorio');
  if (!candidate.name || candidate.name.trim().length === 0) errors.push('El campo name es obligatorio');
  if (!candidate.organization || candidate.organization.trim().length === 0) errors.push('El campo organization es obligatorio');
  if (!candidate.endpoint || !/^https?:\/\//i.test(candidate.endpoint)) errors.push('El endpoint debe ser una URL HTTP/HTTPS válida');
  if (!candidate.termsUrl || !/^https?:\/\//i.test(candidate.termsUrl)) errors.push('termsUrl debe ser una URL válida');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.checkedAt)) errors.push('checkedAt debe seguir el formato ISO YYYY-MM-DD');
  if (!['rss-2.0', 'atom-1.0', 'rss-1.0', 'json-rest'].includes(candidate.format)) errors.push('Formato no soportado');
  if (!['es', 'en', 'mul'].includes(candidate.language)) errors.push('Idioma no soportado');
  if (!['aprobada', 'pendiente', 'excluida'].includes(candidate.status)) errors.push('Estado no válido');
  if (!candidate.topics || candidate.topics.length === 0) errors.push('Debe tener al menos un tema asignado');
  if (candidate.status === 'aprobada') {
    if (!candidate.permits.title) errors.push('Una fuente aprobada debe admitir titular');
    if (!candidate.permits.canonicalLink) errors.push('Una fuente aprobada debe admitir enlace canónico');
    if (candidate.permits.maxSummaryChars <= 0) errors.push('maxSummaryChars debe ser mayor a 0 para fuentes aprobadas');
  }
  return { valid: errors.length === 0, errors };
}

/** Devuelve las fuentes candidatas filtradas por estado (aprobada, pendiente o excluida). */
export function getNewsSourcesByStatus(status: NewsSourceStatus): NewsSourceCandidate[] {
  return NEWS_SOURCE_CANDIDATES.filter((c) => c.status === status);
}

/** Devuelve las fuentes candidatas filtradas por idioma. */
export function getNewsSourcesByLanguage(lang: NewsLanguage): NewsSourceCandidate[] {
  return NEWS_SOURCE_CANDIDATES.filter((c) => c.language === lang || c.language === 'mul');
}

/** Devuelve la selección inicial recomendada para el recolector. */
export function getInitialApprovedSources(): NewsSourceCandidate[] {
  return NEWS_SOURCE_CANDIDATES.filter((c) => c.isInitialSelection && c.status === 'aprobada');
}

/**
 * Sanitiza y recorta un elemento de noticias para almacenar estrictamente
 * el titular, el enlace y un extracto breve, garantizando que nunca se almacene
 * ni copie un artículo íntegro en la base de datos de la app.
 */
export function sanitizeNewsSnippet(raw: RawNewsItemInput, maxSummaryChars = 280): NewsArticleSnippet {
  const cleanTitle = stripHtml(raw.title);
  if (!cleanTitle) {
    throw new Error('El titular limpio no puede estar vacío');
  }
  if (!raw.url || !/^https?:\/\//i.test(raw.url)) {
    throw new Error('La URL canónica debe ser válida y comenzar por http:// o https://');
  }

  const rawText = raw.contentOrSummary ? stripHtml(raw.contentOrSummary) : '';
  let shortSummary = rawText;
  if (shortSummary.length > maxSummaryChars) {
    shortSummary = `${shortSummary.slice(0, maxSummaryChars - 1).trimEnd()}…`;
  }

  const id = raw.id ?? `${raw.sourceId}:${encodeURIComponent(raw.url)}`;
  const publishedAt = raw.publishedAt && !isNaN(Date.parse(raw.publishedAt))
    ? new Date(raw.publishedAt).toISOString()
    : new Date().toISOString();

  return {
    id,
    sourceId: raw.sourceId,
    title: cleanTitle,
    shortSummary,
    url: raw.url.trim(),
    publishedAt,
    authors: raw.authors?.filter((a) => a && a.trim().length > 0).map((a) => a.trim()),
    doi: raw.doi?.trim(),
    journalOrSource: raw.journalOrSource?.trim(),
    language: raw.language ?? 'en',
  };
}

/** Parser de elementos de resumen de PubMed (esummary). */
export function parsePubMedSummaryItem(uid: string, item: Record<string, unknown>): NewsArticleSnippet {
  const title = String(item.title ?? '').replace(/\.$/, '');
  const pubdate = String(item.pubdate ?? item.sortpubdate ?? new Date().toISOString());
  const source = String(item.source ?? item.fulljournalname ?? 'PubMed');
  const authors = Array.isArray(item.authors)
    ? (item.authors as Array<{ name?: string }>).map((a) => a.name).filter((n): n is string => Boolean(n))
    : [];

  let doi: string | undefined;
  if (Array.isArray(item.articleids)) {
    const doiObj = (item.articleids as Array<{ idtype?: string; value?: string }>).find((a) => a.idtype === 'doi');
    if (doiObj?.value) doi = doiObj.value;
  }

  const authorSnippet = authors.length > 0 ? `Autores: ${authors.slice(0, 3).join(', ')}${authors.length > 3 ? ' et al.' : ''}. ` : '';
  const summary = `${authorSnippet}Publicado en ${source} (${pubdate}).`;

  return sanitizeNewsSnippet({
    id: `pubmed:${uid}`,
    sourceId: 'pubmed-eutils',
    title,
    contentOrSummary: summary,
    url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
    publishedAt: pubdate,
    authors,
    doi,
    journalOrSource: source,
    language: 'en',
  });
}

/** Parser de elementos de búsqueda de PLOS ONE. */
export function parsePlosDocItem(doc: Record<string, unknown>): NewsArticleSnippet {
  const title = String(doc.title_display ?? doc.title ?? '');
  const doi = String(doc.id ?? '');
  const pubDate = String(doc.publication_date ?? new Date().toISOString());
  const journal = String(doc.journal ?? 'PLOS ONE');
  const authors = Array.isArray(doc.author_display)
    ? (doc.author_display as string[])
    : [];

  let abstractText = '';
  if (Array.isArray(doc.abstract) && doc.abstract.length > 0) {
    abstractText = String(doc.abstract[0]);
  }

  return sanitizeNewsSnippet({
    id: `plos:${doi}`,
    sourceId: 'plos-one',
    title,
    contentOrSummary: abstractText,
    url: `https://doi.org/${doi}`,
    publishedAt: pubDate,
    authors,
    doi,
    journalOrSource: journal,
    language: 'en',
  }, 280);
}

/** Respuestas sintéticas representativas de fixtures para pruebas de parsers sin copiar artículos completos. */
export const SAMPLE_NEWS_FIXTURES = {
  pubmedEsummaryJson: {
    header: { type: 'esummary', version: '0.3' },
    result: {
      uids: ['42366542'],
      '42366542': {
        uid: '42366542',
        pubdate: '2026 Dec',
        sortpubdate: '2026/12/01 00:00',
        source: 'Ann Med',
        fulljournalname: 'Annals of medicine',
        title: 'Effects of blood flow restriction training combined with resistance training on lower-limb strength and sport-specific performance in athletes: a systematic review and meta-analysis.',
        authors: [
          { name: 'Xu Q', authtype: 'Author' },
          { name: 'Wang Y', authtype: 'Author' },
          { name: 'Ma D', authtype: 'Author' },
        ],
        articleids: [
          { idtype: 'pubmed', value: '42366542' },
          { idtype: 'doi', value: '10.1080/07853890.2026.2658885' },
        ],
      },
    },
  },

  plosSearchJson: {
    response: {
      numFound: 1,
      start: 0,
      docs: [
        {
          id: '10.1371/journal.pone.0298711',
          journal: 'PLOS ONE',
          publication_date: '2026-05-14T00:00:00Z',
          author_display: ['García-Pérez D', 'López-Gómez M'],
          title_display: 'Neuromuscular fatigue and velocity loss thresholds during back squat protocols',
          abstract: [
            'Objective: To evaluate mechanical velocity loss markers and electromyographic signals during high-intensity squat series in trained athletes. Methods: Twenty participants completed velocity-controlled sets...',
          ],
        },
      ],
    },
  },

  frontiersRssXml: `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Frontiers in Sports and Active Living | New and Recent Articles</title>
    <link>https://www.frontiersin.org/journals/sports-and-active-living</link>
    <description>RSS Feed for Frontiers in Sports and Active Living</description>
    <pubDate>Tue, 03 Nov 2026 12:00:00 GMT</pubDate>
    <item>
      <title><![CDATA[Position-specific associations between physical demands and match performance in professional basketball]]></title>
      <link>https://www.frontiersin.org/articles/10.3389/fspor.2026.1948023</link>
      <pubdate>2026-11-03T00:00:00Z</pubdate>
      <description><![CDATA[Understanding how physical demands relate to match performance is essential for optimizing load management and position-specific preparation in athletes.]]></description>
    </item>
  </channel>
</rss>`,

  fisiologiaRssXml: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Fisiología del Ejercicio by Dr. López Chicharro</title>
    <link>https://www.fisiologiadelejercicio.com</link>
    <description>Blog de Fisiología del Ejercicio y Entrenamiento</description>
    <language>es</language>
    <item>
      <title><![CDATA[Creatina y beta-alanina en deportes de resistencia: ¿cuándo pueden mejorar el rendimiento?]]></title>
      <link>https://www.fisiologiadelejercicio.com/creatina-y-beta-alanina-en-deportes-de-resistencia-cuando-pueden-mejorar-el-rendimiento/</link>
      <dc:creator><![CDATA[José López Chicharro]]></dc:creator>
      <pubDate>Tue, 03 Nov 2026 04:00:34 +0000</pubDate>
      <description><![CDATA[En los deportes de resistencia, el rendimiento no depende únicamente de la capacidad aeróbica. Repasamos la evidencia de suplementación ergogénica en esfuerzos intermitentes.]]></description>
    </item>
  </channel>
</rss>`,

  jissnRdfXml: `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://www.tandfonline.com/loi/rssn20">
    <title>Journal of the International Society of Sports Nutrition</title>
    <link>https://www.tandfonline.com/loi/rssn20</link>
    <description>Table of Contents</description>
  </channel>
  <item rdf:about="/doi/full/10.1080/15502783.2026.2720733">
    <title>Effects of resistance training volume and protein timing on body composition</title>
    <link>https://www.tandfonline.com/doi/full/10.1080/15502783.2026.2720733</link>
    <dc:date>2026-08-21T05:44:29Z</dc:date>
    <dc:creator>Yang C, Huang M, Zhou H</dc:creator>
    <description>Investigating the physiological response to resistance training volume configurations in trained adults.</description>
  </item>
</rdf:RDF>`,
};
