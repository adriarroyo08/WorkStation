import { expect, test } from './fixtures';

// Puente nativo simulado: pide permiso por pantalla y responde como lo haría MainActivity.
const stubNative = (page: import('@playwright/test').Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { WorkstationNative: Record<string, unknown>; __workstationFromNative: (s: string) => void; __asked: number };
    w.__asked = 0;
    const noop = () => {};
    w.WorkstationNative = {
      sendToWatch: noop,
      requestWatchStatus: noop,
      scheduleRest: noop,
      cancelRest: noop,
      workoutOngoing: noop,
      workoutEnded: noop,
      saveFile: noop,
      openWatchApp: noop,
      notificationsState: () => 'ask',
      requestNotifications: () => {
        w.__asked++;
        setTimeout(() => w.__workstationFromNative(JSON.stringify({ kind: 'notif_result', granted: true })), 20);
      },
    };
  });

const prompt = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Avisos del entreno' });
const start = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Empezar entrenamiento vacío' }).click();
const started = (page: import('@playwright/test').Page) => expect(page.getByRole('button', { name: 'Añadir ejercicio' })).toBeVisible();
const discard = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Terminar' }).click();
  await page.locator('form.ask').getByRole('button', { name: 'Descartar' }).click();
};

test('Activar avisos: explica, pide el permiso, arranca y no vuelve a preguntar', async ({ page, errors }) => {
  void errors;
  await stubNative(page);
  await page.goto('/');
  await start(page);
  await expect(prompt(page)).toContainText('pantalla de bloqueo');
  await page.getByRole('button', { name: 'Activar avisos' }).click();
  await started(page);
  await expect(prompt(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(1);
  await discard(page);
  await start(page);
  await started(page);
  await expect(prompt(page)).toHaveCount(0);
});

test('Ahora no: arranca igualmente, no pide permiso y no vuelve a preguntar', async ({ page, errors }) => {
  void errors;
  await stubNative(page);
  await page.goto('/');
  await start(page);
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await started(page);
  expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(0);
  await discard(page);
  await start(page);
  await started(page);
  await expect(prompt(page)).toHaveCount(0);
});

test('en el navegador no se muestra nada', async ({ page, errors }) => {
  void errors;
  await page.goto('/');
  await start(page);
  await started(page);
  await expect(prompt(page)).toHaveCount(0);
});
