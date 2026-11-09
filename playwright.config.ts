import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT || '4174';
// Segundo build con el proyecto común simulado: el consentimiento y Google solo existen con él (e2e/consent.spec.ts).
const sharedProjectPort = String(Number(port) + 1);
const sharedProjectDir = 'node_modules/.cache/e2e-shared';

// Pruebas de extremo a extremo sobre el build de producción (vite preview).
// En local puedes usar un Chromium ya instalado con PW_CHROMIUM=/ruta/al/chromium.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Pixel 7'],
    locale: 'es-ES',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: [
    {
      command: `npm --prefix app run preview -- --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm --prefix app run build -- --outDir ${sharedProjectDir} && npm --prefix app run preview -- --outDir ${sharedProjectDir} --port ${sharedProjectPort} --strictPort`,
      url: `http://localhost:${sharedProjectPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { VITE_SUPABASE_URL: 'https://fake-project.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon-key', VITE_GOOGLE_WEB_CLIENT_ID: 'fake-client' },
    },
  ],
});
