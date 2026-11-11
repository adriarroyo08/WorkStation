import { acceptDialogs, expect, test } from './fixtures';

type Page = import('@playwright/test').Page;
type Bridge = { WorkstationNative: Record<string, unknown>; __workstationFromNative: (s: string) => void; __hc: string[]; __exports: string[]; __status: Record<string, unknown> };

// Puente nativo simulado: responde como HealthConnectUi. Con status null imita una versión de la app sin Health Connect.
const stubNative = (page: Page, status: Record<string, unknown> | null) =>
  page.addInitScript((initial) => {
    const w = window as unknown as Bridge;
    w.__hc = [];
    w.__exports = [];
    const noop = () => {};
    const send = () => w.__workstationFromNative(JSON.stringify({ kind: 'health_connect', status: w.__status, denied: false }));
    w.WorkstationNative = { sendToWatch: noop, requestWatchStatus: noop, scheduleRest: noop, cancelRest: noop, workoutOngoing: noop, workoutEnded: noop, saveFile: noop, openWatchApp: noop };
    if (!initial) return;
    w.__status = initial;
    Object.assign(w.WorkstationNative, {
      healthConnectRefresh: () => setTimeout(send, 0),
      healthConnectEnable: () => {
        w.__hc.push('enable');
        w.__status = { ...w.__status, enabled: true, exercise: true, heartRate: true };
        setTimeout(send, 0);
      },
      healthConnectDisable: () => {
        w.__hc.push('disable');
        w.__status = { ...w.__status, enabled: false };
        setTimeout(send, 0);
      },
      healthConnectOpen: () => w.__hc.push('open'),
      healthConnectExport: (json: string) => (w.__exports.push(json), true),
    });
  }, status);

const OFF = { availability: 'available', enabled: false, exercise: false, heartRate: false };
const bridge = (page: Page) => page.evaluate(() => {
  const w = window as unknown as Bridge;
  return { hc: w.__hc, exports: w.__exports };
});
const openSettings = async (page: Page) => {
  await page.goto('/');
  await page.locator('nav').getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible();
};
const heading = (page: Page) => page.getByRole('heading', { name: 'Health Connect' });
const toggle = (page: Page) => page.getByRole('checkbox', { name: 'Exportar entrenamientos a Health Connect' });
const status = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text });
const logOneSet = async (page: Page) => {
  await acceptDialogs(page);
  await page.getByRole('button', { name: 'Empezar entrenamiento vacío' }).click();
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click();
  await page.getByPlaceholder('Buscar ejercicio…').fill('press de banca');
  await page.locator('.exrow', { hasText: 'Press de banca (barra)' }).first().click();
  const row = page.locator('.set:not(.head)').first();
  const inputs = row.locator('input[inputmode]');
  await inputs.nth(0).fill('60');
  await inputs.nth(1).fill('10');
  await row.getByLabel('Completar serie').click();
};

test('en el navegador no aparece Health Connect', async ({ page, errors }) => {
  void errors;
  await openSettings(page);
  await expect(page.getByRole('heading', { name: 'Reloj y sensores' })).toBeVisible();
  await expect(heading(page)).toHaveCount(0);
});

test('una versión antigua de la app no muestra la opción y termina el entreno igual', async ({ page, errors }) => {
  void errors;
  await stubNative(page, null);
  await openSettings(page);
  await expect(page.getByRole('heading', { name: 'Reloj y sensores' })).toBeVisible();
  await expect(heading(page)).toHaveCount(0);
  await page.goto('/');
  await logOneSet(page);
  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByText('¡Buen trabajo!')).toBeVisible();
});

test('se activa y desactiva desde Ajustes con un control con nombre accesible', async ({ page, errors }) => {
  void errors;
  await stubNative(page, OFF);
  await openSettings(page);
  await expect(toggle(page)).not.toBeChecked();
  await expect(status(page, 'nunca lee')).toBeVisible();
  await toggle(page).click();
  await expect(toggle(page)).toBeChecked();
  await expect(status(page, 'con su pulso')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir Health Connect' }).click();
  await toggle(page).click();
  await expect(toggle(page)).not.toBeChecked();
  expect((await bridge(page)).hc).toEqual(['enable', 'open', 'disable']);
});

test('sin proveedor no se ofrece activar', async ({ page, errors }) => {
  void errors;
  await stubNative(page, { ...OFF, availability: 'unavailable' });
  await openSettings(page);
  await expect(status(page, 'no está disponible')).toBeVisible();
  await expect(toggle(page)).toHaveCount(0);
});

test('si falta actualizar el proveedor se ofrece instalarlo', async ({ page, errors }) => {
  void errors;
  await stubNative(page, { ...OFF, availability: 'update_required' });
  await openSettings(page);
  await expect(toggle(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Instalar o actualizar Health Connect' })).toBeVisible();
});

test('con el permiso retirado lo explica y el interruptor queda apagado', async ({ page, errors }) => {
  void errors;
  await stubNative(page, { ...OFF, enabled: true });
  await openSettings(page);
  await expect(status(page, 'retirado el permiso')).toBeVisible();
  await expect(toggle(page)).not.toBeChecked();
});

test('al terminar se entrega la sesión real, una sola vez', async ({ page, errors }) => {
  void errors;
  await stubNative(page, { ...OFF, enabled: true, exercise: true });
  await page.goto('/');
  await logOneSet(page);
  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByText('¡Buen trabajo!')).toBeVisible();
  const { exports } = await bridge(page);
  expect(exports).toHaveLength(1);
  const session = JSON.parse(exports[0]) as { v: number; startMs: number; endMs: number; hr: unknown[] };
  expect(session.v).toBe(1);
  expect(session.endMs).toBeGreaterThan(session.startMs);
  expect(session.hr).toEqual([]);
});

test('un entreno descartado no se entrega', async ({ page, errors }) => {
  void errors;
  await stubNative(page, { ...OFF, enabled: true, exercise: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar entrenamiento vacío' }).click();
  await page.getByRole('button', { name: 'Terminar' }).click();
  await page.locator('form.ask').getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento vacío' })).toBeVisible();
  expect((await bridge(page)).exports).toEqual([]);
});
