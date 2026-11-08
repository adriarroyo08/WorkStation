import AxeBuilder from '@axe-core/playwright';
import { SAMPLE, expect, seed, test } from './fixtures';

for (const theme of ['light', 'dark'] as const) {
  test(`rango y descarga reversible en ${theme}`, async ({ page, errors }) => {
    void errors;
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    const sets = Array.from({ length: 3 }, () => ({ type: 'normal', weight: 80, reps: 10, rpe: 9.5, done: true }));
    await seed(page, {
      ...SAMPLE,
      routines: [{ id: 'range', name: 'Rango', exercises: [{ exerciseId: 'press-banca', sets: Array.from({ length: 3 }, () => ({ type: 'normal', weight: 80, repsMin: 8, reps: 12 })) }] }],
      workouts: [14, 7, 1].map((days) => ({
        id: `history-${days}`,
        name: 'Previo',
        startedAt: new Date(Date.now() - days * 86400000).toISOString(),
        exercises: [{ exerciseId: 'press-banca', sets }],
      })),
    });
    await page.getByRole('button', { name: 'Empezar rutina Rango', exact: true }).click();
    const reps = page.getByRole('textbox', { name: 'Repeticiones', exact: true });
    await reps.first().fill('');
    await expect(reps.first()).toHaveAttribute('placeholder', '8-12');
    await page.locator('.suggestion button').first().click();
    await expect(page.getByText('Objetivo: 8-12 reps · Si haces 3×12, la próxima vez subes a 82,5 kg.')).toBeVisible();
    await page.getByText('Rendimiento de las últimas sesiones', { exact: true }).click();
    await expect(page.getByText(/Rendimiento estabilizado/)).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/issue-120/registro-${theme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Aplicar descarga', exact: true }).click();
    await expect(reps).toHaveCount(2);
    await expect(page.getByLabel('Peso (kg)', { exact: true }).first()).toHaveValue('80');
    await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
    await expect(reps).toHaveCount(3);
    await page.getByText('Rendimiento de las \u00faltimas sesiones', { exact: true }).click();
    await page.getByRole('button', { name: 'Descartar aviso para esta sesión' }).click();
    await expect(page.getByText('Rendimiento de las últimas sesiones', { exact: true })).toHaveCount(0);
  });
}

test('meseta sin esfuerzo alto y objetivo en libras', async ({ page, errors }) => {
  void errors;
  await seed(page, {
    ...SAMPLE,
    settings: { unit: 'lb' },
    routines: [{ id: 'range', name: 'Rango', exercises: [{ exerciseId: 'press-banca', sets: Array.from({ length: 3 }, () => ({ type: 'normal', weight: 80, repsMin: 8, reps: 12 })) }] }],
    workouts: [14, 7, 1].map((days) => ({
      id: `history-${days}`,
      name: 'Previo',
      startedAt: new Date(Date.now() - days * 86400000).toISOString(),
      exercises: [{ exerciseId: 'press-banca', sets: Array.from({ length: 3 }, () => ({ type: 'normal', weight: 80, reps: 10, done: true })) }],
    })),
  });
  await page.getByRole('button', { name: 'Empezar rutina Rango', exact: true }).click();
  await page.locator('.suggestion button').first().click();
  await expect(page.locator('.suggestion')).toContainText('la próxima vez subes a 180 lb.');
  await expect(page.locator('.suggestion')).not.toContainText('kg');
  await page.getByText('Rendimiento de las últimas sesiones', { exact: true }).click();
  await expect(page.getByText(/Meseta de repeticiones registradas/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aplicar descarga', exact: true })).toHaveCount(0);
});
