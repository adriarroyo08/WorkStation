/** Decide si un cambio de versión necesita una nueva release. */
export function releaseTag(previous: string, current: string, existingTags: string[]): string | null {
  if (previous === current) return null;
  if (!/^\d+\.\d+\.\d+$/.test(current)) throw new Error(`Versión no válida: ${current}`);
  const tag = `v${current}`;
  return existingTags.includes(tag) ? null : tag;
}
