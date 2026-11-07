# Artículos propios

Añade un fichero `<slug>.md` usando `volumen-semanal.md` como plantilla. El slug es estable: no lo cambies al retitular el artículo. El generador solo procesa ficheros con frontmatter; este README se excluye.

El frontmatter admite exclusivamente `clave: valor` y listas de escalares indentadas con dos espacios y guion. No es YAML completo: no admite objetos, alias, bloques multilínea ni listas entre corchetes. Las comillas exteriores simples o dobles son opcionales y no interpretan escapes. Las claves desconocidas o duplicadas son errores.

Campos obligatorios: `slug` (minúsculas ASCII, números y guiones), `title`, `summary`, `tags` (lista no vacía sin duplicados), `date` (fecha real YYYY-MM-DD), `evidence` y `sources` (lista no vacía). `exercises` es opcional; si aparece debe contener IDs únicos existentes en `DEFAULT_EXERCISES`. No se admiten IDs de ejercicios personalizados de un usuario.

Cada fuente ocupa una línea `DOI | nivel | título bibliográfico`, sin barras verticales dentro del título. Usa DOI desnudo, sin prefijo URL. Verifica manualmente el DOI, el diseño y que el trabajo respalde el texto antes de incorporarlo; la validación offline comprueba formato, duplicados y coherencia, no la existencia ni las conclusiones del estudio. La fuente del ejemplo está verificada en [PubMed](https://pubmed.ncbi.nlm.nih.gov/27433992/).

Valores cerrados de nivel, ordenados para elegir el diseño más fuerte del artículo:

1. `metaanalisis`: metaanálisis o revisión sistemática con metaanálisis.
2. `revision`: revisión sistemática sin metaanálisis o narrativa.
3. `ensayo`: ensayo controlado, aleatorizado o no.
4. `observacional`: cohortes, transversales, EMG o biomecánica.
5. `consenso`: posicionamiento de una sociedad (ACSM, ISSN, NSCA).

`evidence` debe coincidir con el primero de esos niveles presente en sus fuentes. Esta clasificación describe el diseño, no garantiza calidad metodológica ni certeza. La asociación con ejercicios facilita localizar artículos, no acredita evidencia específica de cada variante.

## Markdown seguro

Se admiten títulos de nivel 1–6, párrafos, listas planas con guion o numeradas, citas de una línea, bloques de código con triple acento grave, código en línea, énfasis, negrita y enlaces en línea. Las construcciones no admitidas se conservan como texto literal. No se interpretan HTML, entidades, imágenes, autolinks ni enlaces de referencia. Solo se generan enlaces absolutos http/https, sin credenciales ni espacios o caracteres de control.

`parseArticleMarkdown` devuelve un AST de tipos cerrados en `shared/articles.ts`: los consumidores deben crear elementos por tipo y usar nodos de texto (React children/textContent). Nunca deben convertir `markdown` ni `text` a innerHTML. El Markdown original se guarda como contenido editorial, no como HTML saneado listo para inyectar.

## Generación y consumo offline

Ejecuta `npm run articles` y `npm run check`. Los builds independientes de app, MCP stdio y MCP edge regeneran la biblioteca antes de compilar. Incluye en el commit `shared/articles.generated.ts` y `app/public/articles.json`; ambos contienen `schemaVersion: 1`, `index` con metadatos y `articles` con Markdown y AST. La generación es determinista, sin fecha de ejecución ni peticiones externas, y falla ante slugs o DOI duplicados, fechas inválidas o referencias a ejercicios desconocidos.

La PWA usa `app/src/articles.ts` para leer `articles.json` del mismo origen y lo precachea con el service worker: disponible offline tras instalar la versión completa. No se descargan las fuentes DOI; abrirlas es una acción externa explícita del lector. MCP stdio y HTTP exponen exactamente la misma biblioteca embebida mediante el recurso `workstation://articles/library` (`resources/list` y `resources/read`), sin consultas a terceros. Las herramientas de búsqueda/recomendación y la pantalla corresponden a issues posteriores.

Android se limita al teléfono: su empaquetado actual copia `app/dist` a `assets/www`, incluyendo `articles.json`. El WebView puede consumirlo mediante la misma URL relativa y el mismo contrato, sin service worker ni red. Si en el futuro se usa desde Kotlin, se leería `assets/www/articles.json` y se comprobaría `schemaVersion`; no se modifica Android en esta issue. Wear OS queda fuera de alcance.
