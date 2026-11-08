import AxeBuilder from '@axe-core/playwright';
import { test, expect, tab } from './fixtures';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`artículos: navegación, teclado, filtros y offline (${colorScheme})`, async ({ page, context, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await tab(page, 'Ejercicios').click();
    await expect(page.getByRole('heading', { name: 'Ejercicios', exact: true })).toBeVisible();
    await page.screenshot({ path: `docs/issue-56/entrada-${colorScheme}.png` });
    await page.getByRole('button', { name: /Biblioteca de artículos/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Biblioteca de artículos' })).toBeVisible();
    const search = page.getByRole('textbox', { name: 'Buscar artículos' });
    await search.fill('HIPERTROFÍA volumen');
    const tags = page.getByRole('group', { name: 'Filtrar por etiquetas' });
    await tags.getByRole('button', { name: 'hipertrofia', exact: true }).click();
    await tags.getByRole('button', { name: 'volumen', exact: true }).click();
    await expect(tags.getByRole('button', { pressed: true })).toHaveCount(2);
    await expect(page.locator('.article-card')).toHaveCount(1);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `docs/issue-56/lista-${colorScheme}.png`, fullPage: true });
    await page.locator('.article-card').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Volumen semanal e hipertrofia');
    await expect(page.locator('time')).toHaveAttribute('datetime', '2026-11-07');
    await expect(page.getByRole('region', { name: 'Referencias' }).getByRole('link')).toHaveAttribute('href', 'https://doi.org/10.1080/02640414.2016.1210197');
    await expect(page.locator('.articles')).toContainText('Metaanálisis');
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    // La captura representa lectura con puntero; el foco de teclado se conserva arriba.
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.locator('.article-card').click();
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeFocused();
    await expect(title).toHaveAttribute('tabindex', '-1');
    await expect(title).toHaveCSS('outline-style', 'none');
    expect((await title.boundingBox())!.x).toBe((await page.locator('.article-summary').boundingBox())!.x);
    await page.screenshot({ path: `docs/issue-56/lectura-${colorScheme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await expect(search).toHaveValue('HIPERTROFÍA volumen');
    await expect(tags.getByRole('button', { pressed: true })).toHaveCount(2);
    await expect(page.locator('.article-card')).toBeFocused();
    await search.fill('sin coincidencias');
    await expect(page.getByText('No hay artículos que coincidan con estos filtros.')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(search).toHaveValue('');
    await expect(tags.getByRole('button', { pressed: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('press banca');
    await page.locator('.exrow').first().click();
    await page.getByRole('button', { name: 'Artículos relacionados', exact: true }).click();
    await expect(page.locator('.article-card')).toHaveCount(1);
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('sentadilla');
    await page.locator('.exrow').first().click();
    await expect(page.getByRole('button', { name: 'Artículos relacionados', exact: true })).toHaveCount(0);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // El SW activado toma control en la siguiente navegación.
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await tab(page, 'Ejercicios').click();
    await page.getByRole('button', { name: /Biblioteca de artículos/ }).click();
    await expect(page.locator('.article-card')).toHaveCount(1);
    await page.locator('.article-card').click();
    await expect(page.locator('.article-body')).toContainText('Registrar las series');
    await context.setOffline(false);
  });
}

test('precarga artículos offline antes de abrir la biblioteca', async ({ page, context, errors }) => {
  void errors;
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await tab(page, 'Ejercicios').click();
  await page.getByRole('button', { name: /Biblioteca de artículos/ }).click();
  await page.locator('.article-card').click();
  await expect(page.locator('.article-body')).toContainText('Registrar las series');
  await context.setOffline(false);
});

test('el enlace del Coach abre el lector y permite volver a la pantalla previa', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await tab(page, 'Ejercicios').click();
  await page.getByRole('button', { name: /Biblioteca de artículos/ }).click();
  await page.getByRole('textbox', { name: 'Buscar artículos' }).fill('volumen');
  await page.evaluate(() => {
    location.hash = 'articles/volumen-semanal';
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Volumen semanal e hipertrofia' })).toBeVisible();
  await expect(page.locator('.article-body')).toContainText('Registrar las series');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Buscar artículos' })).toHaveValue('volumen');
  await page.goto('/#articles/no-existe');
  await expect(page.getByText('No se encontró este artículo en la biblioteca incluida en la app.')).toBeVisible();
  await page.goto('/#articles/volumen-semanal');
  await expect(page.locator('.article-body')).toContainText('Registrar las series');
});
