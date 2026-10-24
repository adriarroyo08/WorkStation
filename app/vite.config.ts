import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();

// Política de seguridad de contenido (solo en el build: el servidor de desarrollo usa scripts en línea).
// Scripts solo propios; conexiones HTTPS abiertas porque la IA, Supabase y ExerciseDB los configura el usuario
// (y http://localhost para modelos locales como Ollama o LM Studio).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: http://localhost:* http://127.0.0.1:*",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  // Versión visible en Ajustes y usada para mostrar las novedades tras actualizar.
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_COMMIT__: JSON.stringify(commit) },
  // Rutas relativas para que funcione en GitHub Pages (/workstation/) o en cualquier hosting estático.
  base: './',
  plugins: [
    react(),
    { name: 'csp', apply: 'build', transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`) },
    VitePWA({
      // El registro lo hace src/pwa.ts: avisa de la nueva versión en lugar de recargar sola.
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Workstation',
        short_name: 'Workstation',
        description: 'Tu app personal de entrenamiento con coach IA',
        theme_color: '#0c0a09',
        background_color: '#0c0a09',
        display: 'standalone',
        start_url: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // App completa + fuente latina disponibles sin conexión desde la primera visita.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}', 'assets/inter-latin-*.woff2'],
        // Catálogo e imágenes de ejercicios disponibles sin conexión una vez vistos.
        runtimeCaching: [
          { urlPattern: /catalog\.json$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'catalog' } },
          { urlPattern: /\/anim\/.+\.webp$/, handler: 'CacheFirst', options: { cacheName: 'anim', expiration: { maxEntries: 300 } } },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\//,
            handler: 'CacheFirst',
            options: { cacheName: 'exercise-images', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 180 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
});
