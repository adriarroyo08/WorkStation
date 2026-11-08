import AxeBuilder from '@axe-core/playwright';
import { test, expect, seed, SAMPLE, tab } from './fixtures';

const data = (
  theme: 'dark' | 'light',
  unit = 'kg',
  measurements = [
    { id: 'bw', date: '2026-01-01', bodyweight: 80 },
    { id: 'now', date: '2026-11-01', bodyweight: 100 },
  ],
) => ({
  ...SAMPLE,
  settings: { theme, unit },
  measurements,
  workouts: [{ id: 'pull', name: 'Dominadas con lastre', startedAt: '2026-02-01T10:00:00Z', exercises: [{ exerciseId: 'dominadas', sets: [{ type: 'normal', weight: 10, reps: 5, done: true }] }] }],
});
async function openPullups(page: import('@playwright/test').Page) {
  await tab(page, 'Ejercicios').click();
  await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('Dominadas');
  await page.locator('.exrow').filter({ hasText: 'Dominadas' }).first().click();
}
for (const theme of ['dark', 'light'] as const) {
  test(`carga histórica y gráfico (${theme})`, async ({ page, errors }) => {
    void errors;
    await seed(page, data(theme));
    await openPullups(page);
    const card = page.getByRole('region', { name: 'Carga con peso corporal' });
    await expect(card).toContainText('90 kg');
    await expect(card).toContainText('105 kg');
    await expect(page.getByText('Lastre del 1RM estimado:')).toContainText('0,31');
    await page.getByRole('button', { name: 'Carga total', exact: true }).click();
    await expect(page.locator('.metric-head')).toContainText('90 kg');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `docs/issue-130/dominadas-${theme}.png`, fullPage: true });
    await page.getByRole('button', { name: '1RM estimado', exact: true }).click();
    await expect(page.locator('.metric-head')).toContainText('105 kg');
    await page.getByRole('main').getByRole('button', { name: 'Historial', exact: true }).click();
    await expect(page.locator('.exhistory-session')).toContainText('Carga total: 90 kg · 1RM estimado: 105 kg');
  });
}
test('convierte a lb y permite añadir peso cuando falta', async ({ page, errors }) => {
  void errors;
  await seed(page, data('light', 'lb'));
  await openPullups(page);
  await expect(page.getByRole('region', { name: 'Carga con peso corporal' })).toContainText('198,4 lb');
  await seed(page, data('light', 'kg', []));
  await openPullups(page);
  const card = page.getByRole('region', { name: 'Carga con peso corporal' });
  await expect(card).toContainText('Añade tu peso corporal');
  await expect(page.getByRole('button', { name: 'Carga total', exact: true })).toHaveCount(0);
  await card.getByRole('textbox', { name: 'Peso corporal (kg)', exact: true }).fill('80');
  await card.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(card).toContainText('105 kg');
});

test('carga de un ejercicio asistido', async ({ page, errors }) => {
  void errors;
  const assisted = data('dark');
  await seed(page, {
    ...assisted,
    exercises: [{ id: 'dominadas-asistidas', name: 'Dominadas asistidas prueba', kind: 'assisted', muscle: 'espalda', equipment: 'maquina', custom: true }],
    workouts: [{ ...assisted.workouts[0], exercises: [{ exerciseId: 'dominadas-asistidas', sets: [{ type: 'normal', weight: 20, reps: 8, done: true }] }] }],
  });
  await tab(page, 'Ejercicios').click();
  await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('Dominadas asistidas prueba');
  await page.locator('.exrow').first().click();
  await expect(page.getByRole('region', { name: 'Carga con peso corporal' })).toContainText('60 kg');
  await expect(page.getByRole('region', { name: 'Carga con peso corporal' })).toContainText('76 kg');
});

test('flexiones no muestra carga corporal ni metricas adicionales', async ({ page, errors }) => {
  void errors;
  const pushups = data('light');
  pushups.workouts[0].exercises[0].exerciseId = 'flexiones';
  await seed(page, pushups);
  await tab(page, 'Ejercicios').click();
  await page.getByRole('textbox', { name: 'Buscar ejercicio' }).fill('Flexiones');
  await page.locator('.exrow').first().click();
  await expect(page.getByRole('region', { name: 'Carga con peso corporal' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Carga total', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '1RM estimado', exact: true })).toHaveCount(0);
  await page.getByRole('main').getByRole('button', { name: 'Historial', exact: true }).click();
  await expect(page.locator('.exhistory-session')).not.toContainText('Carga total');
});
