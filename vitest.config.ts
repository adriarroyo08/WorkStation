import { defineConfig } from 'vitest/config';

// Tests unitarios del código compartido. Los e2e (e2e/) se ejecutan con Playwright.
// Umbrales de cobertura: el CI falla si bajan.
export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['shared/**/*.ts'],
      exclude: ['shared/**/*.test.ts', 'shared/anim-index.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: { lines: 90, statements: 85, functions: 85, branches: 70 },
    },
  },
});
