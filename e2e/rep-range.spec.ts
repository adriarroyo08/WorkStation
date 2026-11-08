import AxeBuilder from '@axe-core/playwright';
import { expect, seed, SAMPLE, test } from './fixtures';

for (const scheme of ['light', 'dark'] as const) {
  test(`crea y valida rangos a 360 px en ${scheme}`, async ({ page, errors }) => {
    void errors;
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await seed(page, SAMPLE);
    await page.getByRole('button', { name: 'Nueva rutina', exact: true }).click();
    await page.getByPlaceholder('Nombre de la rutina').fill('Rango 8-12');
    await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click();
    await page.getByPlaceholder('Buscar ejercicio…').fill('press de banca');
    await page.locator('.exrow', { hasText: 'Press de banca (barra)' }).first().click();
    const min = page.getByLabel('Repeticiones mínimas, serie 1', { exact: true });
    const max = page.getByLabel('Repeticiones máximas, serie 1', { exact: true });
    await max.fill('12');
    await min.fill('13');
    await expect(page.getByText('Mín. no puede ser mayor que Máx.', { exact: true })).toBeVisible();
    await expect(min).toHaveAttribute('aria-invalid', 'true');
    await min.fill('101');
    await expect(page.getByText('Indica un número entre 1 y 100.', { exact: true })).toBeVisible();
    await max.fill('0');
    await expect(max).toHaveAttribute('aria-invalid', 'true');
    await max.fill('12');
    await min.fill('8');
    await page.getByRole('button', { name: 'Mismo rango en todas las series' }).click();
    await expect(page.getByLabel('Repeticiones mínimas, serie 3', { exact: true })).toHaveValue('8');
    await expect(page.getByLabel('Repeticiones máximas, serie 3', { exact: true })).toHaveValue('12');
    await expect(min).toHaveAttribute('aria-invalid', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `docs/issue-119/editor-${scheme}.png`, fullPage: true });
    // Un borrador inválido jamás debe persistir su mínimo.
    await page.getByLabel('Repeticiones mínimas, serie 2', { exact: true }).fill('99');
    await page.getByLabel('Repeticiones mínimas, serie 3', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.reload();
    await page.locator('.routine', { hasText: 'Rango 8-12' }).getByRole('button', { name: 'Opciones' }).click();
    await page.getByRole('button', { name: 'Editar rutina', exact: true }).click();
    await expect(min).toHaveValue('8');
    await expect(max).toHaveValue('12');
    await expect(page.getByLabel('Repeticiones mínimas, serie 2', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Repeticiones mínimas, serie 3', { exact: true })).toHaveValue('');
  });
}
