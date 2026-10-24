// Cuenta con email en Perfil: tarjeta, registro, recuperación, cambio de cuenta y pantallas de los enlaces del email.
import type { Page, Route } from '@playwright/test';
import { expect, tab, test } from './fixtures';

const URL_ = 'https://fake-project.supabase.co';
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;

class Mock {
  calls: { path: string; method: string; search: string; body?: unknown }[] = [];
  async attach(page: Page) {
    await page.context().route(`${URL_}/**`, (r) => this.handle(r));
  }
  private handle(route: Route) {
    const req = route.request();
    const u = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    this.calls.push({ path: u.pathname, method: req.method(), search: u.search, body: req.postData() ? req.postDataJSON() : undefined });
    if (u.pathname === '/auth/v1/token') {
      const { email } = req.postDataJSON() as { email: string };
      const id = email.startsWith('ana') ? 'user-ana' : 'user-bea';
      return json({ access_token: jwt(id), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id, aud: 'authenticated', email } });
    }
    if (u.pathname === '/auth/v1/signup') return json({ id: 'user-nuevo', aud: 'authenticated', email: 'nueva@example.com', identities: [{ id: 'x' }] });
    if (u.pathname === '/auth/v1/recover') return json({});
    if (u.pathname === '/auth/v1/user') return json({ id: 'user-ana', aud: 'authenticated', email: 'ana@example.com' });
    if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (u.pathname === '/rest/v1/records') return req.method() === 'GET' ? json([]) : route.fulfill({ status: 201, body: '' });
    return json({}, 404);
  }
  hit = (path: string) => this.calls.filter((c) => c.path === path);
}

// Deja la app apuntando al Supabase simulado (como si fuera el integrado en el build).
async function configure(page: Page) {
  await page.goto('/');
  await page.evaluate(
    (cfg) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onupgradeneeded = () => open.result.createObjectStore('keyval');
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(cfg, 'cloud-config');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { url: URL_, anonKey: 'anon-key' },
  );
  await page.reload();
}

const toEmail = async (page: Page) => {
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: 'Continuar con email' }).click();
};
async function login(page: Page, email: string) {
  await toEmail(page);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('secreto123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

test('sin sesión, Perfil abre con la tarjeta de cuenta y el registro avisa del email', async ({ page, errors }) => {
  void errors;
  const mock = new Mock();
  await mock.attach(page);
  await configure(page);
  await tab(page, 'Perfil').click();
  await expect(page.getByText('Inicia sesión para sincronizar')).toBeVisible();
  // La tarjeta va la primera: antes que las estadísticas.
  const top = await page.locator('section .account').boundingBox();
  const stats = await page.locator('.stats.four').boundingBox();
  expect(top!.y).toBeLessThan(stats!.y);
  await page.getByRole('button', { name: 'Continuar con email' }).click();
  await page.getByRole('button', { name: 'No tengo cuenta' }).click();
  await page.getByLabel('Email').fill('nueva@example.com');
  await page.getByLabel('Contraseña').fill('secreto123');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByText('Te hemos enviado un email')).toBeVisible();
  const signup = mock.hit('/auth/v1/signup')[0];
  expect(new URLSearchParams(signup.search).get('redirect_to')).toMatch(/^http:\/\/localhost:4174\/$/);
});

test('con sesión, la tarjeta muestra el email y Cerrar sesión', async ({ page, errors }) => {
  void errors;
  await new Mock().attach(page);
  await configure(page);
  await login(page, 'ana@example.com');
  await expect(page.locator('.account')).toContainText('ana@example.com');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByText('Inicia sesión para sincronizar')).toBeVisible();
});

test('¿Olvidaste tu contraseña? pide el email de recuperación', async ({ page, errors }) => {
  void errors;
  const mock = new Mock();
  await mock.attach(page);
  await configure(page);
  await toEmail(page);
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page.getByText(/Te hemos enviado un email/)).toBeVisible();
  expect(mock.hit('/auth/v1/recover')).toHaveLength(1);
});

test('al entrar con otra cuenta sale el diálogo propio, no el del navegador', async ({ page, errors }) => {
  void errors;
  await new Mock().attach(page);
  let native = 0;
  page.on('dialog', (d) => (native++, d.accept()));
  await configure(page);
  await login(page, 'ana@example.com');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await toEmail(page);
  await page.getByLabel('Email').fill('bea@example.com');
  await page.getByLabel('Contraseña').fill('secreto123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Has entrado con otra cuenta' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Subir también estos datos' })).toBeVisible();
  await dlg.getByRole('button', { name: 'Empezar de cero' }).click();
  await expect(dlg).toHaveCount(0);
  expect(native).toBe(0);
});

test.describe('enlaces del email', () => {
  test.use({ onboarded: false });
  const tokens = (type: string) => `#access_token=${jwt('user-ana')}&expires_in=3600&refresh_token=r&token_type=bearer&type=${type}`;

  test('recuperación: pide la nueva contraseña, sin tour por encima', async ({ page, errors }) => {
    void errors;
    const mock = new Mock();
    await mock.attach(page);
    await configure(page);
    await page.goto(`/${tokens('recovery')}`);
    await page.reload(); // la misma página con otro hash no recarga la app
    await expect(page.getByRole('heading', { name: 'Elige tu nueva contraseña' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Bienvenida' })).toHaveCount(0);
    await page.getByLabel('Nueva contraseña').fill('otra-clave-1');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(page.getByText('Contraseña actualizada')).toBeVisible();
    expect(mock.calls.some((c) => c.path === '/auth/v1/user' && c.method === 'PUT')).toBe(true);
  });

  test('confirmación: Cuenta confirmada', async ({ page, errors }) => {
    void errors;
    await new Mock().attach(page);
    await configure(page);
    await page.goto(`/${tokens('signup')}`);
    await page.reload(); // la misma página con otro hash no recarga la app
    await expect(page.getByRole('heading', { name: 'Cuenta confirmada' })).toBeVisible();
    await expect(page.getByText('Vuelve a la app e inicia sesión.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Bienvenida' })).toHaveCount(0);
  });
});
