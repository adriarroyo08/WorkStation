// Base para la futura pantalla (#56). La URL local se incluye en el precache de la PWA.
import type { ArticleLibrary } from '../../shared/articles';
export { parseArticleMarkdown, safeArticleUrl } from '../../shared/articles';
export async function loadArticles(): Promise<ArticleLibrary> {
  const response = await fetch(`${import.meta.env.BASE_URL}articles.json`);
  if (!response.ok) throw new Error('No se pudieron cargar los artículos incluidos en la aplicación');
  return response.json() as Promise<ArticleLibrary>;
}
