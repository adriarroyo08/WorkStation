// Utilidades para importar ejercicios de wger (https://wger.de, datos CC BY-SA 4.0) al catálogo.
// Sin imports: lo usa también scripts/build-catalog.mjs con node --experimental-strip-types.

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;:!?])/g, '$1')
    .trim();

/** Pasos de la descripción HTML: los <li> si hay lista; si no, los párrafos; si es un solo bloque, por frases. */
export function wgerSteps(html = ''): string[] {
  const li = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])).filter(Boolean);
  if (li.length) return li;
  const ps = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter(Boolean);
  if (ps.length > 1) return ps;
  const all = text(html);
  return all ? all.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/).filter(Boolean) : [];
}
