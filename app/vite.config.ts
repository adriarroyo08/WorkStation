import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Rutas relativas para que funcione en GitHub Pages (/workstation/) o en cualquier hosting estático.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Workstation',
        short_name: 'Workstation',
        description: 'Tu app personal de entrenamiento con coach IA',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
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
