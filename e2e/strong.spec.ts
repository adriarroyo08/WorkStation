import { readFileSync, mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { SAMPLE, expect, seed, tab, test } from './fixtures';

const input = readFileSync(new URL('../shared/fixtures/strong/unitless.csv', import.meta.url));
async function stored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ data: typeof SAMPLE; backups: { id: string; reason: string }[]; entries: Record<string, typeof SAMPLE> }>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readonly');
          const store = tx.objectStore('keyval');
          const values = store.getAll(),
            keys = store.getAllKeys();
          tx.oncomplete = () => {
            const entries = Object.fromEntries(keys.result.map((key, i) => [String(key), values.result[i]]));
            resolve({ data: entries.data, backups: entries.backups ?? [], entries });
          };
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      }),
  );
}
async function choose(page: Page, buffer = input) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar CSV de Strong', exact: true }).click();
  await (await chooser).setFiles({ name: 'strong.csv', mimeType: 'text/csv', buffer });
  return page.getByRole('dialog', { name: 'Vista previa de Strong' });
}
for (const theme of ['light', 'dark'] as const) {
  test(`Strong: revisar, cancelar y confirmar con backup (${theme})`, async ({ page, errors }) => {
    void errors;
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await seed(page, { ...SAMPLE, settings: { theme } });
    await tab(page, 'Perfil').click();
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    const before = await stored(page);
    const dialog = await choose(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Confirmar importación' })).toBeDisabled();
    await expect(dialog.getByText('Elige la unidad de peso para continuar', { exact: true })).toHaveCount(1);
    await expect(dialog).toContainText('0 registros omitidos.');
    mkdirSync('docs/issue-83', { recursive: true });
    await page.screenshot({ path: `docs/issue-83/${theme}-unidad.png` });
    await dialog.getByLabel('Unidad de peso del CSV').selectOption('kg');
    await expect(dialog).toContainText('2 entrenamientos · 5 series · 2 ejercicios personalizados nuevos.');
    await expect(dialog).toContainText('0 registros omitidos.');
    expect((await stored(page)).data).toEqual(before.data);
    // El foco circula dentro de la hoja también usando Mayús+Tab.
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Confirmar importación' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    expect((await stored(page)).data).toEqual(before.data);
    expect((await stored(page)).backups.filter((b) => b.reason === 'antes de importar')).toEqual(before.backups.filter((b) => b.reason === 'antes de importar'));
    await choose(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect((await stored(page)).data).toEqual(before.data);
    await choose(page);
    await dialog.getByLabel('Unidad de peso del CSV').selectOption('lb');
    await dialog.getByText('Torso A ·', { exact: false }).click();
    await expect(dialog).toContainText('Dos líneas:');
    const audit = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: `docs/issue-83/${theme}-previa.png` });
    await dialog.getByRole('button', { name: 'Confirmar importación' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Importados 2 entrenamientos y 5 series desde Strong.', { exact: true })).toBeVisible();
    await expect.poll(async () => (await stored(page)).data.workouts.length).toBe(SAMPLE.workouts.length + 2);
    const after = await stored(page);
    const backup = after.backups.find((b) => b.reason === 'antes de importar');
    expect(backup).toBeTruthy();
    expect(after.entries[`backup:${backup!.id}`]).toEqual(before.data);
    await page.screenshot({ path: `docs/issue-83/${theme}-confirmada.png` });
  });
}
test('Strong: resumen y confirmación en singular', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  const dialog = await choose(page, Buffer.from('Date,Workout Name,Exercise Name,Set Order,Weight (kg),Reps\n2026-10-17,Prueba,Nuevo Strong,1,50,8\n2026-10-17,Prueba,Nuevo Strong,2,invalido,8'));
  await expect(dialog).toContainText('1 entrenamiento · 1 serie · 1 ejercicio personalizado nuevo.');
  await expect(dialog).toContainText('1 registro omitido.');
  await dialog.locator('summary').click();
  await expect(dialog).toContainText('Nuevo Strong · 1 serie');
  await dialog.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(page.getByText('Importado 1 entrenamiento y 1 serie desde Strong.', { exact: true })).toBeVisible();
});

test('Strong: fecha ambigua y columnas incompatibles visibles antes de confirmar', async ({ page, errors }) => {
  void errors;
  await seed(page, SAMPLE);
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  const before = await stored(page);
  const dialog = await choose(page, Buffer.from('Date,Workout Name,Exercise Name,Set Order,Weight (kg),Reps,Extra\n04/05/2026,Torso,Press de banca (barra),1,50,8,ignorado'));
  await expect(dialog).toContainText('Fecha ambigua');
  await expect(dialog).toContainText('1 registro omitido.');
  await expect(dialog).toContainText('Columnas no compatibles (no se importarán): Extra.');
  await expect(dialog.getByRole('button', { name: 'Confirmar importación' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await stored(page)).data).toEqual(before.data);
});
