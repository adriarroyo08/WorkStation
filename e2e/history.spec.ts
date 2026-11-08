import { expect, seed, tab, test } from './fixtures';
import { performanceData } from '../shared/perf-data';
import { DEFAULT_SETTINGS } from '../shared/types';

test('historial largo: conserva las 416 sesiones, su nombre accesible y la apertura por teclado', async ({ page, errors }) => {
  void errors;
  await seed(page, performanceData(DEFAULT_SETTINGS));
  await tab(page, 'Historial').click();
  const rows = page.locator('button.hrow');
  await expect(rows).toHaveCount(30);
  for (let expansion = 1; expansion <= 13; expansion++) {
    const more = page.getByRole('button', { name: /^Ver más/ });
    await more.focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(Math.min(30 + expansion * 30, 416));
  }
  await expect(page.getByRole('button', { name: /^Ver más/ })).toHaveCount(0);
  const labels = await rows.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
  expect(new Set(labels).size).toBe(416);
  expect(labels.every((label) => label?.includes('60 min') && label.includes('24 series') && label.includes('+ 2 más'))).toBe(true);
  await expect(rows.last()).toHaveAccessibleName(/LUN 4 NOV 2024 Fuerza 1/);
  await rows.last().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Fuerza 1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volver', exact: true })).toBeVisible();
});
