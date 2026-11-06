import AxeBuilder from '@axe-core/playwright';
import { test, expect, seed, SAMPLE, tab } from './fixtures';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`evidencia real y estimada, teclado y filtros (${colorScheme})`, async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await seed(page, SAMPLE);
    await tab(page, 'Ejercicios').click();
    await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('press banca');
    await page.getByRole('combobox', { name: 'Filtrar por patrón' }).selectOption('empuje-horizontal');
    await page.getByRole('combobox', { name: 'Filtrar por material' }).selectOption('barra');
    await page.getByRole('combobox', { name: 'Filtrar por músculo' }).selectOption('pecho');
    await expect(page.locator('.exrow').first()).toContainText('Press de banca');
    await page.screenshot({ path: `artifacts/evidence-filters-${colorScheme}.png`, fullPage: true });
    await page.locator('.exrow').first().focus();
    await page.keyboard.press('Enter');
    const evidence = page.getByRole('region', { name: 'Evidencia del ejercicio' });
    await expect(evidence).toContainText('EMG');
    await expect(evidence.getByRole('link').first()).toHaveAttribute('href', /^https?:/);
    await expect(evidence.getByRole('list', { name: 'Músculos por rol' })).toContainText('principal');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/evidence-sourced-${colorScheme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page.getByRole('combobox', { name: 'Filtrar por patrón' })).toHaveValue('');
    await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('copenhague');
    await page.locator('.exrow').first().click();
    await expect(evidence).toContainText('Evidencia estimada');
    await expect(evidence.getByRole('link')).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/evidence-estimated-${colorScheme}.png`, fullPage: true });
  });
}

test('selector combina y limpia patrones', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await page.locator('.routine .grow', { hasText: 'Pierna A' }).first().click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  const picker = page.getByRole('dialog', { name: 'Añadir ejercicio' });
  await picker.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('press banca');
  await picker.getByRole('combobox', { name: 'Filtrar por patrón' }).selectOption('bisagra');
  await expect(picker.locator('.exrow')).toHaveCount(0);
  await picker.getByRole('combobox', { name: 'Filtrar por patrón' }).selectOption('empuje-horizontal');
  await picker.getByRole('combobox', { name: 'Filtrar por músculo' }).selectOption('pecho');
  await picker.getByRole('combobox', { name: 'Filtrar por material' }).selectOption('barra');
  await expect(picker.locator('.exrow').first()).toContainText('Press de banca');
  await picker.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(picker.getByRole('textbox', { name: 'Buscar ejercicio' })).toHaveValue('');
  await expect(picker.getByRole('combobox', { name: 'Filtrar por patrón' })).toHaveValue('');
});

test('catalogo y personalizado sin metadatos no atribuyen evidencia', async ({ page, errors }) => {
  void errors;
  await seed(page, { ...SAMPLE, exercises: [{ id: 'custom-52', name: 'Prueba sin ciencia', muscle: 'core', equipment: 'otro', kind: 'reps', custom: true }] });
  await tab(page, 'Ejercicios').click();
  await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('Prueba sin ciencia');
  await page.locator('.exrow').first().click();
  await expect(page.getByRole('heading', { name: 'Prueba sin ciencia' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Evidencia del ejercicio' })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'M\u00fasculos que trabaja' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'M\u00fasculos principales y secundarios' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('zottman');
  await page.locator('.exrow').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Zottman');
  await expect(page.getByRole('region', { name: 'Evidencia del ejercicio' })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'M\u00fasculos que trabaja' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'M\u00fasculos principales y secundarios' })).toBeVisible();
});
