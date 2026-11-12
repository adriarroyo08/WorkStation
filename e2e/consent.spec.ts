import AxeBuilder from '@axe-core/playwright';
// Consentimiento de medidas corporales y pulso con el proyecto común de Supabase (simulado, build propio de playwright.config.ts).
import type { Page, Route } from '@playwright/test';
import { HEALTH_CONSENT_VERSION } from '../shared/health-consent';
import { expect, tab, test } from './fixtures';

const URL_ = 'https://fake-project.supabase.co';
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;
const CONSENT = { health_consent: { version: HEALTH_CONSENT_VERSION, accepted_at: '2026-11-09T10:00:00.000Z' } };
const NAME = /medidas corporales y mi pulso/;

test.use({ baseURL: `http://localhost:${Number(process.env.PLAYWRIGHT_PORT || '4174') + 1}` });

class Project {
  /** Metadatos de la cuenta en el servidor. */
  metadata: Record<string, unknown> = {};
  /** La sesión lleva metadatos anteriores a los del servidor (aceptó en otro dispositivo). */
  staleSession = false;
  calls: { path: string; method: string; search: string; body?: Record<string, unknown> }[] = [];
  private user = (metadata = this.metadata) => ({ id: 'user-ana', aud: 'authenticated', email: 'ana@example.com', user_metadata: metadata });
  async attach(page: Page) {
    await page.context().route(`${URL_}/**`, (r) => this.handle(r));
  }
  private handle(route: Route) {
    const req = route.request();
    const u = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    this.calls.push({ path: u.pathname, method: req.method(), search: u.search, body: req.postData() ? req.postDataJSON() : undefined });
    if (u.pathname === '/auth/v1/authorize') {
      // Lo que haría Google: vuelve a la app con los tokens en el hash, en una carga nueva.
      const back = `${u.searchParams.get('redirect_to')}#access_token=${jwt('user-ana')}&expires_in=3600&refresh_token=r&token_type=bearer`;
      return route.fulfill({ status: 200, contentType: 'text/html', body: `<script>location.replace(${JSON.stringify(back)})</script>` });
    }
    if (u.pathname === '/auth/v1/token')
      return json({
        access_token: jwt('user-ana'),
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'r',
        user: this.user(this.staleSession ? {} : this.metadata),
      });
    if (u.pathname === '/auth/v1/signup') return json({ id: 'user-nuevo', aud: 'authenticated', email: 'nueva@example.com', identities: [{ id: 'x' }] });
    if (u.pathname === '/auth/v1/user') {
      if (req.method() === 'PUT') this.metadata = { ...this.metadata, ...(req.postDataJSON() as { data: object }).data };
      return json(this.user());
    }
    if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (u.pathname === '/functions/v1/delete-account') return json({ deleted: true });
    if (u.pathname === '/rest/v1/records') return req.method() === 'GET' ? json([]) : route.fulfill({ status: 201, body: '' });
    if (u.pathname === '/rest/v1/api_keys') return req.method() === 'GET' ? json([]) : route.fulfill({ status: 201, body: '' });
    return json({}, 404);
  }
  hit = (path: string, method?: string) => this.calls.filter((c) => c.path === path && (!method || c.method === method));
}

type Bridge = { WorkstationNative: Record<string, unknown>; __workstationFromNative: (s: string) => void; __uploads: string[] };
/** Móvil con reloj emparejado que ya tiene una key de subida. */
const stubWatchWithKey = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as Bridge;
    w.__uploads = [];
    let user = 'user-ana';
    const noop = () => {};
    w.WorkstationNative = {
      sendToWatch: noop,
      scheduleRest: noop,
      cancelRest: noop,
      workoutOngoing: noop,
      workoutEnded: noop,
      saveFile: noop,
      openWatchApp: noop,
      requestWatchStatus: () => setTimeout(() => w.__workstationFromNative(JSON.stringify({ kind: 'watch_status', nodes: ['Reloj'] })), 0),
      watchUploadUser: () => user,
      watchUploadExpiry: () => new Date(Date.now() + 80 * 86400e3).toISOString(),
      setWatchUpload: (json: string) => {
        w.__uploads.push(json);
        user = json ? (JSON.parse(json) as { userId: string }).userId : '';
        return true;
      },
    };
  });

async function login(page: Page) {
  await page.goto('/');
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: 'Continuar con email' }).click();
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
}
const gate = (page: Page) => page.getByRole('dialog', { name: 'Tu consentimiento para sincronizar' });
const axe = async (page: Page) => expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);

test('crear cuenta con email exige la casilla sin premarcar y guarda fecha y versión', async ({ page, errors }) => {
  void errors;
  const project = new Project();
  await project.attach(page);
  await page.goto('/');
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: 'Continuar con email' }).click();
  await page.getByRole('button', { name: 'No tengo cuenta' }).click();
  await page.getByLabel('Email').fill('nueva@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('Secreto123');
  await page.getByLabel('Repetir contraseña').fill('Secreto123');
  const box = page.getByRole('checkbox', { name: NAME });
  const create = page.getByRole('button', { name: 'Crear cuenta', exact: true });
  await expect(box).not.toBeChecked();
  await expect(create).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Registrarse con Google' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', /PRIVACY\.md$/);
  await axe(page);
  await box.check();
  await create.click();
  await expect(page.getByText('Te hemos enviado un email')).toBeVisible();
  const [signup] = project.hit('/auth/v1/signup');
  expect(signup.body!.data).toEqual({ health_consent: { version: HEALTH_CONSENT_VERSION, accepted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) } });
});

test('Google: lo marcado sobrevive a la redirección y se guarda en la cuenta sin volver a preguntar', async ({ page, errors }) => {
  void errors;
  const project = new Project();
  await project.attach(page);
  await page.goto('/');
  await tab(page, 'Perfil').click();
  const google = page.getByRole('button', { name: 'Continuar con Google' });
  await expect(google).toBeDisabled();
  await page.getByRole('checkbox', { name: NAME }).check();
  await google.click();
  await expect.poll(() => project.hit('/auth/v1/user', 'PUT').length).toBe(1);
  expect(project.metadata).toEqual({ health_consent: { version: HEALTH_CONSENT_VERSION, accepted_at: expect.stringMatching(/^\d{4}-/) } });
  await expect.poll(() => project.hit('/rest/v1/records', 'GET').length).toBeGreaterThan(0);
  await expect(gate(page)).toHaveCount(0);
});

test('una cuenta existente sin aceptación: se le pide una vez y hasta aceptar no se sincroniza ni se emite la key del reloj', async ({ page, errors }) => {
  void errors;
  const project = new Project();
  await project.attach(page);
  await stubWatchWithKey(page);
  await login(page);
  const dialog = gate(page);
  await expect(dialog).toBeVisible();
  const box = dialog.getByRole('checkbox', { name: NAME });
  await expect(box).toBeFocused();
  await expect(box).not.toBeChecked();
  await expect(dialog.getByRole('link', { name: 'Política de privacidad' })).toBeVisible();
  const accept = dialog.getByRole('button', { name: 'Aceptar y sincronizar' });
  await expect(accept).toBeDisabled();
  await axe(page);

  // El foco no sale del diálogo y Escape no lo cierra.
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Borrar cuenta' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(box).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();

  // Nada baja ni sube, tampoco al recuperar la conexión; la key que ya tenía el móvil se retira.
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(800);
  expect(project.hit('/rest/v1/records')).toHaveLength(0);
  expect(project.hit('/rest/v1/api_keys', 'POST')).toHaveLength(0);
  const uploads = () => page.evaluate(() => (window as unknown as Bridge).__uploads);
  expect(await uploads()).toEqual(['']);

  await box.check();
  await accept.click();
  await expect(dialog).toHaveCount(0);
  expect(project.metadata).toEqual({ health_consent: { version: HEALTH_CONSENT_VERSION, accepted_at: expect.stringMatching(/^\d{4}-/) } });
  await expect.poll(() => project.hit('/rest/v1/records', 'GET').length).toBeGreaterThan(0);
  await expect.poll(() => project.hit('/rest/v1/api_keys', 'POST').length).toBe(1);
  await expect.poll(uploads).toHaveLength(2);

  await page.reload();
  await tab(page, 'Perfil').click();
  await expect(page.locator('.account')).toContainText('ana@example.com');
  await expect(gate(page)).toHaveCount(0);
  expect(project.hit('/auth/v1/user', 'PUT')).toHaveLength(1);
});

test('la aceptación hecha en otro dispositivo vale aunque la sesión guardada sea anterior', async ({ page, errors }) => {
  void errors;
  const project = new Project();
  project.metadata = CONSENT;
  project.staleSession = true;
  await project.attach(page);
  await login(page);
  await expect(page.locator('.account')).toContainText('ana@example.com');
  await expect.poll(() => project.hit('/rest/v1/records', 'GET').length).toBeGreaterThan(0);
  await expect(gate(page)).toHaveCount(0);
  expect(project.hit('/auth/v1/user', 'PUT')).toHaveLength(0);
});

test('desde la petición se puede cerrar sesión', async ({ page, errors }) => {
  void errors;
  const project = new Project();
  await project.attach(page);
  await login(page);
  await gate(page).getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(gate(page)).toHaveCount(0);
  await expect(page.getByText('Inicia sesión para sincronizar')).toBeVisible();
  expect(project.hit('/rest/v1/records')).toHaveLength(0);
});

test('desde la petición se puede borrar la cuenta, y cancelar devuelve a la petición', async ({ page, errors }) => {
  void errors;
  const project = new Project();
  await project.attach(page);
  await login(page);
  await gate(page).getByRole('button', { name: 'Borrar cuenta' }).click();
  const sheet = page.getByRole('dialog', { name: '¿Borrar tu cuenta?' });
  await expect(sheet.getByLabel('Escribe BORRAR para confirmar')).toBeFocused();
  await sheet.getByRole('button', { name: 'Cancelar' }).click();
  await expect(gate(page).getByRole('checkbox', { name: NAME })).toBeFocused();
  await gate(page).getByRole('button', { name: 'Borrar cuenta' }).click();
  await sheet.getByLabel('Escribe BORRAR para confirmar').fill('BORRAR');
  await sheet.getByRole('button', { name: 'Borrar definitivamente' }).click();
  await expect(page.getByText('Inicia sesión para sincronizar')).toBeVisible();
  await expect(gate(page)).toHaveCount(0);
  expect(project.hit('/functions/v1/delete-account', 'POST')).toHaveLength(1);
  expect(project.hit('/rest/v1/records')).toHaveLength(0);
});
