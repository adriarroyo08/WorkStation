import { continueRender, delayRender, staticFile } from 'remotion';

export const C = {
  bg: '#0a0807',
  card: '#1a1614',
  text: '#f8f4f1',
  muted: '#a3968e',
  accent: '#ff5f1f',
  accent2: '#ff2d6f',
  ok: '#c6f34a',
  warn: '#ffb224',
  danger: '#ff4545',
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
