import { ARTICLE_LIBRARY } from './articles.generated';

// Recurso estático común a MCP stdio/HTTP. Sin acceso a datos del usuario ni a red.
export const ARTICLE_RESOURCE = {
  uri: 'workstation://articles/library',
  name: 'articles',
  title: 'Artículos propios de entrenamiento',
  description: 'Índice, Markdown y estructura segura de artículos incluidos en esta versión.',
  mimeType: 'application/json',
};
export function readArticleResource(uri: string) {
  if (uri !== ARTICLE_RESOURCE.uri) throw new Error(`Recurso desconocido: ${uri}`);
  return { contents: [{ uri, mimeType: ARTICLE_RESOURCE.mimeType, text: JSON.stringify(ARTICLE_LIBRARY) }] };
}
