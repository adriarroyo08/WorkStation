import { defineConfig } from 'vitest/config';

// Tests unitarios del código compartido. Los e2e (e2e/) se ejecutan con Playwright.
export default defineConfig({ test: { include: ['shared/**/*.test.ts'] } });
