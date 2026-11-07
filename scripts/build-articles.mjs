// Sin red ni dependencias adicionales. Falla antes de escribir si hay errores editoriales.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildArticleLibrary } from '../shared/articles.ts';

const root = new URL('../', import.meta.url);
const directory = new URL('content/articulos/', root);
const files = readdirSync(directory)
  .filter((name) => name.endsWith('.md') && name !== 'README.md')
  .sort()
  .map((name) => ({ name, content: readFileSync(new URL(name, directory), 'utf8') }));
// Mismo formato de filas que scripts/build-anims.py; evita cargar el cat?logo cient?fico en Node.
const exercises = readFileSync(new URL('shared/exercises.ts', root), 'utf8');
const exerciseIds = new Set([...exercises.matchAll(/^\s*\['([^']+)',/gm)].map((match) => match[1]));
if (!exerciseIds.size) throw new Error('No se encontraron IDs en shared/exercises.ts');
const library = buildArticleLibrary(files, exerciseIds);
const json = JSON.stringify(library, null, 2) + '\n';
writeFileSync(new URL('app/public/articles.json', root), json);
writeFileSync(
  new URL('shared/articles.generated.ts', root),
  `// Generado por scripts/build-articles.mjs. No editar.\nimport type { ArticleLibrary } from './articles';\nexport const ARTICLE_LIBRARY: ArticleLibrary = ${json.trim()};\n`,
);
console.log(`${library.index.length} artículos validados: ${fileURLToPath(directory)}`);
