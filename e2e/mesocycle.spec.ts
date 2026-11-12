import AxeBuilder from '@axe-core/playwright';
import { SAMPLE, acceptDialogs, expect, seed, test } from './fixtures';

const axe = async (page: import('@playwright/test').Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;

for (const scheme of ['light', 'dark'] as const) {
  test(`programa: crear, entrenar y avanzar en ${scheme}`, async ({ page, errors }) => {
    void errors;
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await seed(page, SAMPLE);
    await acceptDialogs(page);

    // Crear desde la plantilla y ajustar la primera semana.
    await page.getByRole('button', { name: 'Programa de la carpeta Torso / Pierna', exact: true }).click();
    await expect(page.getByRole('button', { name: /Bloque de fuerza · 4 semanas/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Fase de la semana 4', { exact: true })).toHaveValue('descarga');
    await page.getByLabel('Series de la semana 1', { exact: true }).fill('3');
    await expect(page.getByLabel('Press de banca (barra)', { exact: true })).toBeChecked();
    await expect(page.getByLabel('Sentadilla (barra)', { exact: true })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await axe(page)).toEqual([]);
    await page.screenshot({ path: `docs/issue-137/crear-${scheme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Empezar programa', exact: true }).click();

    // Seguimiento: semana 1, peso desde el 1RM estimado (sentadilla 100×5 → 116,7 kg × 70 % → 80 kg).
    const sheet = page.locator('.program');
    await expect(sheet.getByRole('heading', { name: 'Semana 1 de 4' })).toBeVisible();
    await expect(sheet.locator('.program-lifts li', { hasText: 'Sentadilla' })).toContainText('3×8 · 70 % 1RM → 80 kg');
    await expect(sheet.locator('.program-lifts li', { hasText: 'Press de banca' })).toContainText('3×8 · 70 % 1RM → 70 kg');
    await expect(sheet.getByRole('progressbar', { name: 'Sesiones hechas' })).toHaveAttribute('aria-valuenow', '0');
    expect(await axe(page)).toEqual([]);
    await page.screenshot({ path: `docs/issue-137/seguimiento-${scheme}.png`, fullPage: true });
    await page.keyboard.press('Escape');

    // Entrenar la sesión que toca: sale con la prescripción de la semana.
    const today = page.locator('.today');
    await expect(today).toContainText('Semana 1 de 4 · Acumulación');
    await today.getByRole('button', { name: 'Empezar' }).click();
    const squat = page.locator('.excard', { hasText: 'Sentadilla (barra)' });
    await expect(squat.getByLabel('Peso (kg)')).toHaveCount(3);
    await expect(squat.getByLabel('Peso (kg)').first()).toHaveValue('80');
    await expect(squat.locator('.suggestion')).toHaveCount(0);
    for (const r of await squat.locator('.set:not(.head)').all()) await r.getByLabel('Completar serie').click();
    await page.getByRole('button', { name: 'Terminar', exact: true }).click();
    await expect(page.getByText('¡Buen trabajo!')).toBeVisible();

    // El progreso avanza.
    await page.reload();
    await page.getByRole('button', { name: 'Programa de la carpeta Torso / Pierna', exact: true }).click();
    await expect(page.getByRole('progressbar', { name: 'Sesiones hechas' })).toHaveAttribute('aria-valuenow', '1');
    await expect(page.getByText('1 de 8 sesiones', { exact: false })).toBeVisible();
  });
}
