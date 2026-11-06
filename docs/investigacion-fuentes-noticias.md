# Investigación de fuentes abiertas de noticias y condiciones de reutilización

> **Estado**: Entregable de investigación previo a la implementación del recolector.  
> **Épica**: Parte de #36 («Épica: noticias de fitness integradas»).  
> **Issue**: Closes #58.  
> **Fecha de consulta y verificación de enlaces**: 2026-11-03.  

---

## 1. Resumen ejecutivo

El objetivo de la épica #36 es integrar dentro de WorkStation una sección de actualidad e investigación reciente en entrenamiento de fuerza, hipertrofia, biomecánica y nutrición deportiva. La aplicación debe mostrar exclusivamente **titular, resumen breve y enlace al contenido original**, respetando estrictamente los derechos de autor, sin almacenar ni duplicar artículos completos.

Este documento audita doce candidatos técnicos (APIs REST y feeds RSS/Atom de instituciones científicas, revistas de acceso abierto y blogs de divulgación basada en evidencia), comprueba la validez operativa de sus endpoints, analiza sus condiciones de servicio y licencias, y define la selección inicial recomendada para el recolector backend en Supabase Edge Functions / MCP.

---

## 2. Marco legal: acceso público frente a permiso de reutilización

Un error común en la agregación de contenidos es confundir **acceso técnico público** con **derecho de reutilización**:

1. **Acceso público (disponibilidad técnica)**: Cualquier usuario o script puede descargar un feed RSS o consumir un endpoint sin credenciales privadas. Que un feed sea accesible públicamente por HTTP/HTTPS **no implica** que su contenido sea de dominio público o que pueda redistribuirse libremente.
2. **Permiso de reutilización (propiedad intelectual)**:
   - **Dominio Público (CC0 / US Government Work 17 U.S.C. § 105)**: Los metadatos de NLM/PubMed y Crossref pueden reutilizarse sin restricciones patrimoniales, requiriendo únicamente cita y sin atribuir respaldo institucional.
   - **Licencias Creative Commons (CC BY 4.0)**: Revistas como *PLOS ONE*, *Frontiers in Sports and Active Living* o *JISSN* permiten la redistribución e incluso obras derivadas y uso comercial, siempre que se atribuya autoría, editorial, DOI y enlace a la licencia.
   - **Todos los derechos reservados (Copyright tradicional en blogs y medios)**: En fuentes como *Stronger by Science*, *Fisiología del Ejercicio* o *Vitónica*, el autor retiene la totalidad de los derechos. Aunque muchos CMS (p. ej. WordPress) incluyen el artículo completo en la etiqueta `<content:encoded>` del feed, **republicar ese contenido íntegro en una app vulnera la propiedad intelectual**. Solo está amparada la sindicación informativa tradicional: **titular, extracto corto orientativo (`description` o sinopsis breve) y enlace canónico directo al sitio original**.

---

## 3. Tabla de candidatos investigados

| # | Fuente / Nombre | Organización | Idioma | Endpoint verificado | Formato | Frecuencia | Autenticación / Cuotas | Licencia | URL de condiciones (verificado 2026-11-03) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **PubMed E-utilities** | National Center for Biotechnology Information (NCBI / NLM / NIH, EE. UU.) | Inglés | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` y `esummary.fcgi` | REST JSON / XML | Diaria / Continua | Pública: 3 req/s sin API key; 10 req/s con clave gratuita NCBI. Obligatorio `tool` y `email`. | Dominio Público en EE. UU. (17 U.S.C. § 105) para metadatos NLM. Abstracts sujetos a copyright de editoriales. | [NLM Terms and Conditions](https://www.nlm.nih.gov/databases/download/terms_and_conditions.html) y [NCBI Policies](https://www.ncbi.nlm.nih.gov/home/about/policies/) |
| 2 | **PLOS ONE** | Public Library of Science (PLOS, EE. UU.) | Inglés | `https://api.plos.org/search?q=title:"resistance+training"&wt=json` y `https://journals.plos.org/plosone/feed/atom` | REST JSON y Atom 1.0 | Continua (semanal) | Abierta sin token; uso razonable de servidor (< 10 req/s). | Creative Commons Attribution 4.0 (CC BY 4.0). | [PLOS Open Access License](https://plos.org/open-science/open-access/) |
| 3 | **Frontiers in Sports and Active Living** | Frontiers Media SA (Suiza) | Inglés | `https://www.frontiersin.org/journals/sports-and-active-living/rss` | RSS 2.0 | Continua (diaria/semanal) | Pública sin token (`ttl=60` min). | Metadatos CC0; Artículos CC BY 4.0. | [Frontiers Terms and Conditions](https://www.frontiersin.org/about/terms-and-conditions) |
| 4 | **JISSN (Journal of the International Society of Sports Nutrition)** | ISSN / Taylor & Francis | Inglés | `https://www.tandfonline.com/feed/rss/rssn20` | RSS 1.0 (RDF/XML) | Mensual / Continua | Pública sin token. | Open Access Gold (CC BY 4.0). | [Taylor & Francis JISSN Information](https://www.tandfonline.com/action/journalInformation?journalCode=rssn20) |
| 5 | **Crossref REST API** | Publishers International Linking Association (Crossref) | Multilingüe (EN) | `https://api.crossref.org/works?query=resistance+training+hypertrophy` | REST JSON | Continua | Pool público: 1-5 req/s. Pool "Polite" (con cabecera `User-Agent: WorkStation (mailto:email)`): 3-10 req/s. | Metadatos bibliográficos CC0 1.0 Universal. | [Crossref REST API Terms](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) |
| 6 | **Fisiología del Ejercicio** | Dr. José López Chicharro (España) | Español | `https://www.fisiologiadelejercicio.com/feed/` | RSS 2.0 (WordPress) | Diaria (días laborables) | Pública sin token. | Todos los derechos reservados (Copyright © Dr. J. L. Chicharro). Acceso público para lectura y sindicación de extractos. | [Aviso Legal Fisiología del Ejercicio](https://www.fisiologiadelejercicio.com/aviso-legal/) |
| 7 | **Stronger by Science** | Stronger by Science LLC (Greg Nuckols / Eric Trexler, EE. UU.) | Inglés | `https://www.strongerbyscience.com/feed/` | RSS 2.0 (WordPress) | Semanal / Quincenal | Pública sin token (cacheada por Cloudflare). | Todos los derechos reservados. No reutilización comercial de artículos íntegros. | [Terms of Use Stronger by Science](https://www.strongerbyscience.com/terms-and-conditions/) |
| 8 | **Vitónica** | Webedia Brand Services SL (España) | Español | `https://www.vitonica.com/feedburner.xml` | RSS 2.0 | Diaria (múltiples artículos/día) | Pública sin token (CloudFront). | Todos los derechos reservados (Webedia). Sindicación no comercial limitada a titular + extracto breve + enlace. | [Aviso Legal Vitónica](https://www.vitonica.com/aviso-legal) |
| 9 | **SpringerLink / BMC Sports Science** | Springer Nature | Inglés | `https://link.springer.com/search.rss?facet-content-type=Article&facet-journal-id=13102` | RSS 2.0 | Continua | Requiere cookie de autorización IDP de Springer. | Artículos CC BY, pero endpoint técnico cerrado con cookie/redirección HTTP 303. | [Springer Nature Terms](https://www.springernature.com/gp/legal/terms-of-use) |
| 10 | **Europe PMC REST API** | EMBL-EBI / Consorcio Europe PMC | Inglés | `https://europepmc.org/RestWebService/v1/search` | REST JSON | Continua | 10 req/s. Bloqueada actualmente por Cloudflare Managed Challenge en clientes sin cabecera de navegador. | Metadatos abiertos. | [Europe PMC Terms](https://europepmc.org/TermsOfUse) |
| 11 | **Examine.com** | Examine Inc. | Inglés | N/A (no dispone de feed RSS público ni API abierta) | N/A | N/A | De pago (Examine+). No ofrece sindicación abierta. | Todos los derechos reservados. | [Examine Terms of Use](https://examine.com/terms/) |
| 12 | **Menno Henselmans / Look Great Naked** | Blogs de investigadores particulares | Inglés | `https://mennohenselmans.com/feed/` y `https://www.lookgreatnaked.com/feed/` | RSS 2.0 | Variable | Bloqueados en el edge por WAF (Cloudflare 403 / Apache 406 mod_security). | Todos los derechos reservados. | Avisos legales de sitios respectivos |

---

## 4. Matriz de decisión por fuente y campos admitidos

| Fuente | Titular | Resumen breve | Enlace original | Estado | Decisión y justificación técnica/legal |
|---|:---:|:---:|:---:|:---:|---|
| **PubMed E-utilities** | Sí | Sí (máx. 300 caracteres o metadatos de autores y revista) | Sí | **Aprobada** | Fuente de referencia médica mundial. Metadatos libres. El abstract se recorta a extracto breve para evitar disputas de copyright con editoriales propietarias. Requiere enviar `tool=WorkStation&email=dev@workstation.app`. |
| **PLOS ONE** | Sí | Sí (abstract completo o resumen corto) | Sí | **Aprobada** | Licencia CC BY 4.0 que permite explícitamente reutilización de metadatos y resúmenes con atribución. API REST JSON con respuesta estructurada limpia. |
| **Frontiers in Sports and Active Living** | Sí | Sí (resumen breve) | Sí | **Aprobada** | Revista puntera de acceso abierto CC BY 4.0 con metadatos CC0. Feed RSS 2.0 activo, accesible sin bloqueos ni claves. |
| **JISSN (Taylor & Francis)** | Sí | Sí | Sí | **Aprobada** | La revista oficial de la Sociedad Internacional de Nutrición Deportiva es Open Access (CC BY 4.0). Feed RDF/XML operativo en Taylor & Francis. |
| **Crossref REST API** | Sí | Sí (metadatos bibliográficos / abstract si existe) | Sí | **Aprobada** | Ideal como motor de búsqueda de literatura y normalizador de DOIs. Metadatos CC0 de libre utilización; pool Polite con alta estabilidad. |
| **Fisiología del Ejercicio (Chicharro)** | Sí | Sí (máx. 250 caracteres) | Sí | **Aprobada** | Principal candidato en español de rigor académico. Feed RSS estándar. Condición: extraer solo el texto breve inicial de `description` y prohibir explícitamente el volcado de `content:encoded`. Enlace siempre visible. |
| **Stronger by Science** | Sí | Sí (máx. 250 caracteres del extracto) | Sí | **Aprobada** | Referente internacional en divulgación de fuerza e hipertrofia. Feed RSS activo. Prohibición estricta de copiar el HTML completo de `content:encoded`; solo titular, excerpt y backlink. |
| **Vitónica (Webedia)** | Sí | Sí (máx. 200 caracteres) | Sí | **Pendiente** | Disponible técnicamente vía Feedburner, pero sus términos prohíben explícitamente el uso no personal o comercial sin contrato con Webedia. Se mantiene en reserva para uso personal o condicionada a revisión jurídica si la app monetiza. |
| **SpringerLink / BMC Sports Science** | No | No | No | **Excluida** | El endpoint de búsqueda RSS redirige con HTTP 303 a `idp.springer.com` exigiendo cookies interactivas. Inviable para consumo en Edge Functions. |
| **Europe PMC REST API** | Sí | Sí | Sí | **Pendiente** | API excelente sobre el papel, pero Cloudflare bloquea con página interactiva de reto las llamadas directas desde centros de datos. Pendiente de probar con proxy residencial o cabeceras específicas. |
| **Examine.com** | No | No | No | **Excluida** | No ofrece feed RSS ni API pública abierta. Modelo comercial cerrado tras suscripción. |
| **Menno Henselmans / Look Great Naked** | No | No | No | **Excluida** | Bloqueo activo de firewalls (Cloudflare 403 / Apache 406) que rechaza peticiones automatizadas estándar. |

---

## 5. Selección inicial justificada

Para la fase de implementación de la Épica #36 (recolector backend en Supabase Edge Function y pantalla en la app), se propone la siguiente selección inicial de **6 fuentes activas**:

1. **PubMed E-utilities (`esearch` + `esummary`)**: Para publicaciones indexadas en MEDLINE con filtro específico de fuerza e hipertrofia (`resistance training[Title/Abstract] AND hypertrophy[Title/Abstract]`). Metadatos oficiales, enlace a PMID/DOI.
2. **PLOS ONE (Search API / Atom)**: Para artículos científicos multidisciplinares de libre distribución (CC BY 4.0), con búsqueda por palabras clave de fuerza.
3. **Frontiers in Sports and Active Living (RSS)**: Para investigación continua de alto nivel en ciencias del deporte, con feed RSS 2.0 y licencia abierta CC BY 4.0.
4. **Journal of the International Society of Sports Nutrition (JISSN RSS)**: Para investigación específica en nutrición deportiva, suplementación (creatina, proteínas) y rendimiento de fuerza.
5. **Fisiología del Ejercicio (RSS)**: Para garantizar contenido riguroso en español con actualización casi diaria, mostrando titular, extracto breve y enlace al artículo del Dr. López Chicharro.
6. **Stronger by Science (RSS)**: Para artículos en profundidad de Greg Nuckols y colaboradores, limitando la ingesta a titular, sinopsis corta y enlace.

Adicionalmente, se integra **Crossref REST API** como servicio auxiliar de resolución de metadatos cuando se disponga de un DOI.

---

## 6. Arquitectura recomendada para la fase de implementación

Para cumplir con los criterios de privacidad, rendimiento y legalidad:

1. **No llamadas directas desde el navegador**: La PWA nunca debe llamar a estas fuentes directamente. Se vulnerarían políticas de CORS y se expondría la dirección IP de los usuarios a terceros.
2. **Recolector en Supabase Edge Function (`supabase/functions/news-collector` o MCP)**:
   - Tarea periódica (cron) o bajo demanda con caché en base de datos.
   - Cabecera obligatoria de cortesía:  
     `User-Agent: WorkStation-NewsBot/1.0 (+https://workstation.app/news-bot; contacto: dev@workstation.app)`.
   - Para PubMed: parámetros `tool=WorkStation&email=dev@workstation.app`.
3. **Normalización estricta**:
   - Cada elemento almacenado debe seguir el contrato tipado en `shared/news-sources.ts`.
   - Limpieza de HTML: etiquetas eliminadas, entidades HTML decodificadas, enlaces relativos convertidos a absolutos.
   - Límite de resumen: truncado forzoso a 280 caracteres con elipsis, asegurando que nunca se almacene el texto completo.
4. **Fixtures sin infracción de derechos**:
   - Para las pruebas unitarias y de integración de los parsers (RSS 2.0, RSS 1.0, Atom 1.0 y REST JSON), se proporcionan respuestas sintéticas representativas en `shared/news-sources.ts` con titulares realistas y resúmenes breves, sin incluir artículos completos ni material bajo copyright.
