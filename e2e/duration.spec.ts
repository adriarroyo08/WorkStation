import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { SAMPLE, acceptDialogs, expect, seed, test } from './fixtures';

const data = {
  ...SAMPLE,
  routines: [
    {
      id: 'iso',
      name: 'Isométricos',
      exercises: [
        {
          exerciseId: 'plancha',
          restSec: 60,
          sets: [
            { type: 'normal', durationSec: 2 },
            { type: 'normal', durationSec: 2 },
          ],
        },
      ],
    },
  ],
  workouts: [
    {
      id: 'previo',
      name: 'Isométricos',
      routineId: 'iso',
      startedAt: new Date(Date.now() - 864e5).toISOString(),
      endedAt: new Date(Date.now() - 864e5 + 18e5).toISOString(),
      exercises: [
        {
          exerciseId: 'plancha',
          sets: [
            { type: 'normal', durationSec: 75, done: true },
            { type: 'normal', durationSec: 42, done: true },
          ],
        },
      ],
    },
  ],
};

const prepare = async (page: Page, scheme: 'light' | 'dark') => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await seed(page, data);
};
const start = (page: Page) => page.getByRole('button', { name: 'Empezar rutina Isométricos', exact: true }).click();
const timerButton = (page: Page, verb: string, n = 1) => page.getByRole('button', { name: `${verb} cronómetro, serie ${n}`, exact: true });

// Una pantalla bloqueada congela la página: al volver, el reloj real ha avanzado sin que corra ningún código.
const elapseWhileLocked = (page: Page, ms: number) =>
  page.evaluate((delta) => {
    const sw = JSON.parse(localStorage.getItem('set-stopwatch')!);
    localStorage.setItem('set-stopwatch', JSON.stringify({ ...sw, startedAt: sw.startedAt - delta }));
  }, ms);

for (const scheme of ['light', 'dark'] as const) {
  test(`cronómetro de serie a 360 px en ${scheme}`, async ({ page, errors }) => {
    void errors;
    await acceptDialogs(page);
    await prepare(page, scheme);
    await start(page);

    const time = page.getByRole('timer', { name: 'Tiempo de la serie' });
    const field = page.getByLabel('Tiempo (s)', { exact: true }).first();
    await expect(page.locator('.set:not(.head) .prev').first()).toHaveText('1:15');

    await timerButton(page, 'Iniciar').click();
    await expect(page.getByText('En marcha · objetivo 2 s', { exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Objetivo alcanzado' })).toBeVisible({ timeout: 6000 });
    await expect(page.locator('.sw-panel.reached')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/issue-139/cronometro-${scheme}.png`, fullPage: true });

    // Recargar no pierde el tiempo ni repite el aviso como si fuera nuevo.
    await page.reload();
    await expect(time).not.toHaveText('0:00');
    await expect(page.locator('.sw-panel.reached')).toBeVisible();

    // Con la pantalla bloqueada el tiempo sigue contando.
    await elapseWhileLocked(page, 90_000);
    await page.reload();
    await expect(time).toHaveText(/^1:3\d$/);

    // La pausa se maneja con teclado y también sobrevive a una recarga.
    await timerButton(page, 'Pausar').focus();
    await page.keyboard.press('Enter');
    await expect(timerButton(page, 'Reanudar')).toBeFocused();
    await expect(page.getByText('En pausa · objetivo 2 s', { exact: true })).toBeVisible();
    const paused = await time.textContent();
    await page.waitForTimeout(1300);
    await expect(time).toHaveText(paused!);
    await page.reload();
    await expect(time).toHaveText(paused!);
    await expect(field).toHaveAttribute('readonly', '');

    // Guardar escribe los segundos en la serie y devuelve el foco al cronómetro.
    await page.getByRole('button', { name: 'Guardar tiempo', exact: true }).click();
    await expect(time).toHaveCount(0);
    await expect(timerButton(page, 'Iniciar')).toBeFocused();
    await expect(field).toHaveValue(/^9\d$/);
    await expect(field).not.toHaveAttribute('readonly', '');
    await page.getByRole('button', { name: 'Completar serie' }).first().click();

    // Cuelgue y sentadilla isométrica del catálogo también se registran por tiempo.
    for (const name of ['Suspensión colgado en barra', 'Sentadilla isométrica en pared']) {
      await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click();
      await page.getByPlaceholder('Buscar ejercicio…').fill(name);
      await page.locator('.exrow', { hasText: name }).first().click();
      const card = page.locator('.excard', { hasText: name });
      await expect(card.locator('.set.head span').nth(3)).toHaveText('Tiempo');
      await expect(card.getByRole('button', { name: 'Iniciar cronómetro, serie 1', exact: true })).toBeVisible();
      await expect(card.getByLabel('Repeticiones', { exact: true })).toHaveCount(0);
    }

    // El detalle muestra el tiempo guardado y nunca repeticiones.
    await page.getByRole('button', { name: 'Terminar', exact: true }).click();
    const set = page.locator('.setlist li').first();
    await expect(set).toHaveText(/^1:3\d$/);
    await expect(page.locator('.ex-head').first()).toContainText(/Mejor serie: 1:3\d/);
    await page.screenshot({ path: `docs/issue-139/detalle-${scheme}.png`, fullPage: true });
  });

  test(`objetivo de duración editable en la rutina en ${scheme}`, async ({ page, errors }) => {
    void errors;
    await prepare(page, scheme);
    await page.locator('.routine', { hasText: 'Isométricos' }).getByRole('button', { name: 'Opciones' }).click();
    await page.getByRole('button', { name: 'Editar rutina', exact: true }).click();
    const goal = page.getByLabel('Objetivo en segundos, serie 1', { exact: true });
    await expect(goal).toHaveValue('2');
    await goal.fill('45');
    await expect(page.locator('.rset.head span').nth(2)).toHaveText('Objetivo (s)');
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `docs/issue-139/rutina-${scheme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.reload();
    await start(page);
    await expect(page.getByLabel('Tiempo (s)', { exact: true }).first()).toHaveValue('45');
    // La última sesión no llegó a 45 s en todas las series: toca repetir el objetivo.
    await expect(page.locator('.suggestion').first()).toContainText('Hoy: 45 s');
  });
}

test('empezar otro cronómetro guarda el tiempo del anterior', async ({ page, errors }) => {
  void errors;
  await prepare(page, 'dark');
  await start(page);
  await timerButton(page, 'Iniciar', 1).click();
  await elapseWhileLocked(page, 12_000);
  await page.reload();
  await timerButton(page, 'Pausar', 1).click();
  await expect(page.getByText(/En pausa/)).toBeVisible();
  await timerButton(page, 'Iniciar', 2).click();
  await expect(page.locator('.sw-panel')).toHaveCount(1);
  await expect(page.getByLabel('Tiempo (s)', { exact: true }).first()).toHaveValue(/^1[23]$/);
  await expect(timerButton(page, 'Pausar', 2)).toBeVisible();
});

test('completar la serie con el cronómetro activo usa su tiempo', async ({ page, errors }) => {
  void errors;
  await prepare(page, 'light');
  await start(page);
  await timerButton(page, 'Iniciar', 1).click();
  await elapseWhileLocked(page, 30_000);
  await page.reload();
  await page.getByRole('button', { name: 'Completar serie' }).first().click();
  await expect(page.locator('.sw-panel')).toHaveCount(0);
  await expect(page.getByLabel('Tiempo (s)', { exact: true }).first()).toHaveValue(/^3[01]$/);
});
