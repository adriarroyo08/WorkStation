import { continueRender, delayRender, staticFile } from 'remotion';

export const C = {
  bg: '#07090d',
  card: '#151921',
  text: '#eef1f6',
  muted: '#8d95a3',
  accent: '#5b8cff',
  accent2: '#8b5cf6',
  ok: '#22c55e',
  warn: '#f59e0b',
  danger: '#ef4444',
};

export const GRAD = `linear-gradient(135deg, ${C.accent}, ${C.accent2})`;
export const FONT = "'Inter', system-ui, sans-serif";

// Carga Inter (la misma fuente de la app) antes de renderizar el primer frame.
let loaded = false;
export function ensureFont() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Cargando Inter');
  const face = new FontFace('Inter', `url(${staticFile('fonts/inter.woff2')}) format('woff2')`, { weight: '100 900' });
  face
    .load()
    .then((f) => {
      document.fonts.add(f);
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
}
