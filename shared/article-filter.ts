import type { ArticleSummary } from './articles';

export const articleSlugFromHash = (hash: string): string | null => /^#articles\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(hash)?.[1] ?? null;

const fold = (text: string) =>
  text
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Todas las palabras y todas las etiquetas seleccionadas deben coincidir. */
export function filterArticles<T extends ArticleSummary>(articles: readonly T[], query = '', tags: readonly string[] = [], exerciseId?: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return articles.filter(
    (article) =>
      (!exerciseId || article.exercises.includes(exerciseId)) &&
      tags.every((tag) => article.tags.includes(tag)) &&
      words.every((word) => fold(`${article.title} ${article.summary} ${article.tags.join(' ')}`).includes(word)),
  );
}
