import { defineConfig, devices } from '@playwright/test';

// Pruebas de extremo a extremo sobre el build de producción (vite preview).
// En local puedes usar un Chromium ya instalado con PW_CHROMIUM=/ruta/al/chromium.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4174',
    ...devices['Pixel 7'],
    locale: 'es-ES',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npm --prefix app run preview -- --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
  },
});
