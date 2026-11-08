import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { expect, test } from './fixtures';

const endpoint = '**/functions/v1/mcp/news';
const article = {
  id: 'a',
  sourceId: 'revista',
  title: 'Entrenamiento de fuerza y recuperación',
  shortSummary: 'Un resumen breve sobre la adaptación al entrenamiento.',
  url: 'https://example.org/fuerza',
  publishedAt: '2026-11-07T10:00:00Z',
  topics: ['fuerza'],
  language: 'es',
  journalOrSource: 'Revista de entrenamiento',
  authors: ['Ana García'],
};
const payload = {
  updatedAt: '2026-11-08T12:00:00Z',
  items: [
    article,
    { ...article, id: 'b', title: 'Nutrición y rendimiento', sourceId: 'ciencia', journalOrSource: 'Ciencia abierta', topics: ['nutricion'] },
    { ...article, id: 'c', title: 'Nutrición para entrenar', topics: ['nutricion'], publishedAt: '' },
  ],
  sources: [{ id: 'revista', updatedAt: '2026-11-08T12:00:00Z', stale: false }],
};

async function setup(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onupgradeneeded = () => open.result.createObjectStore('keyval');
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put({ url: 'https://news-test.supabase.co', anonKey: 'test' }, 'cloud-config');
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Noticias', exact: true }).click();
}

test('filtros combinables, enlaces seguros, fallo de actualización y reapertura offline', async ({ page, errors }) => {
  void errors;
  const requests: string[] = [];
  await page.route(endpoint, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: payload });
  });
  await setup(page);
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('combobox', { name: 'Fuente', exact: true }).selectOption('revista');
  await page.getByRole('combobox', { name: 'Tema', exact: true }).selectOption('nutricion');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Nutrición para entrenar' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Tema', exact: true }).selectOption('biomecanica');
  await expect(page.getByText('No hay noticias con estos filtros.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  const link = page.getByRole('link').first();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).toHaveAttribute('href', article.url);
  await page.route(endpoint, (route) => route.fulfill({ status: 503, body: 'fallo' }));
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText('No se pudo actualizar. Conservamos las noticias anteriores.')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Noticias', exact: true })).toBeVisible();
  await page.context().setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Noticias', exact: true }).click();
  await expect(page.getByText(/Sin conexión/)).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  expect(requests.every((url) => url === 'https://news-test.supabase.co/functions/v1/mcp/news')).toBe(true);
});

test('error sin caché, respuesta inválida y vacío válido', async ({ page, errors }) => {
  void errors;
  await page.route(endpoint, (route) => route.fulfill({ status: 500 }));
  await setup(page);
  await expect(page.getByText(/no hay copia guardada/)).toBeVisible();
  await page.route(endpoint, (route) => route.fulfill({ json: { ...payload, items: [{ ...article, url: 'javascript:alert(1)' }] } }));
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText(/no hay copia guardada/)).toBeVisible();
  await expect(page.getByRole('link')).toHaveCount(0);
  await page.route(endpoint, (route) => route.fulfill({ json: { ...payload, items: [] } }));
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText('Todavía no hay noticias disponibles.')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const)
  test(`noticias: accesibilidad, teclado y capturas ${colorScheme}`, async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.route(endpoint, (route) => route.fulfill({ json: payload }));
    await setup(page);
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Noticias', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Fuente', exact: true })).toBeFocused();
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await mkdir('docs/issue-61', { recursive: true });
    await page.screenshot({ path: `docs/issue-61/noticias-${colorScheme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.screenshot({ path: `docs/issue-61/entrada-${colorScheme}.png`, fullPage: true });
  });
