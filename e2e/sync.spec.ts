// Sincronización con un Supabase simulado (auth + tabla records con "gana el más reciente"), entre dispositivos.
import type { BrowserContext, Page, Route } from '@playwright/test';
import { SAMPLE, expect, seed, tab, test, skipTour } from './fixtures';

const URL_ = 'https://fake-project.supabase.co';
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;
const subOf = (auth?: string) => (auth ? JSON.parse(Buffer.from(auth.replace('Bearer ', '').split('.')[1] ?? '', 'base64url').toString() || '{}').sub : undefined);

type Row = { user_id: string; collection: string; id: string; doc: unknown; deleted: boolean; client_updated_at: string; updated_at: string };
class FakeSupabase {
  rows = new Map<string, Row>();
  private tick = 0;
  // Hora real del "servidor", con microsegundos crecientes (como la migración 003).
  private now() {
    return new Date(Date.now()).toISOString().replace('Z', `${String(this.tick++ % 1000).padStart(3, '0')}+00:00`);
  }
  async attach(ctx: BrowserContext) {
    await ctx.route(`${URL_}/**`, (r) => this.handle(r));
  }
  private async handle(route: Route) {
    const req = route.request();
    const u = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/auth/v1/token') {
      const { email } = req.postDataJSON() as { email: string };
      const id = email.startsWith('ana') ? 'user-ana' : 'user-bea';
      return json({ access_token: jwt(id), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id, aud: 'authenticated', email } });
    }
    if (u.pathname === '/auth/v1/user') return json({ id: subOf(req.headers().authorization), aud: 'authenticated' });
    if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (u.pathname === '/rest/v1/api_keys') return json([]);
    if (u.pathname === '/rest/v1/records') {
      const uid = subOf(req.headers().authorization);
      if (!uid) return json({ message: 'JWT requerido' }, 401);
      if (req.method() === 'GET') {
        const gt = (u.searchParams.get('updated_at') ?? 'gt.1970-01-01T00:00:00Z').slice(3);
        const out = [...this.rows.values()]
          .filter((r) => r.user_id === uid && Date.parse(r.updated_at) > Date.parse(gt) - (r.updated_at > gt ? 0 : 1))
          .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
        return json(out.filter((r) => r.updated_at > gt || Date.parse(r.updated_at) > Date.parse(gt)).slice(0, Number(u.searchParams.get('limit') ?? 1000)));
      }
      if (req.method() === 'POST') {
        for (const r of req.postDataJSON() as Row[]) {
          const k = `${uid}:${r.collection}:${r.id}`;
          const old = this.rows.get(k);
          if (old && Date.parse(r.client_updated_at) < Date.parse(old.client_updated_at)) continue; // trigger de la migración 003
          this.rows.set(k, { ...r, user_id: uid, updated_at: this.now() });
        }
        return route.fulfill({ status: 201, body: '' });
      }
    }
    return json({}, 404);
  }
  count(uid: string, collection: string) {
    return [...this.rows.values()].filter((r) => r.user_id === uid && r.collection === collection && !r.deleted).length;
  }
}

async function signIn(page: Page, email: string) {
  await tab(page, 'Perfil').click();
  const settings = page.getByRole('button', { name: 'Ajustes' });
  const heading = page.getByRole('heading', { name: /Cuenta y sincronización/ });
  await expect(settings.or(heading)).toBeVisible(); // Perfil se carga bajo demanda
  if (await settings.isVisible()) await settings.click(); // si no, ya estamos en Ajustes
  const url = page.getByPlaceholder('https://xxxx.supabase.co');
  await expect(url.or(page.getByLabel('Email'))).toBeVisible(); // Ajustes se carga bajo demanda
  if (await url.isVisible()) {
    await url.fill(URL_);
    await page.getByPlaceholder('eyJhbGciOi…').fill('anon-key');
    await page.getByRole('button', { name: 'Conectar con Supabase' }).click();
  }
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('secreto123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

test('sincroniza entre dos dispositivos y no mezcla cuentas al cambiar de usuario', async ({ page, browser, errors }) => {
  void errors;
  const sb = new FakeSupabase();
  await sb.attach(page.context());
  await seed(page, SAMPLE);
  await signIn(page, 'ana@example.com');
  await expect.poll(() => sb.count('user-ana', 'workouts')).toBe(3);
  expect(sb.count('user-ana', 'exercises')).toBe(0); // la biblioteca de fábrica no se sube
  expect(sb.count('user-ana', 'settings')).toBe(0); // ni los ajustes si siguen siendo los de fábrica

  // Segundo dispositivo, vacío: recibe los entrenos de Ana.
  const ctx2 = await browser.newContext({ ...test.info().project.use });
  await skipTour(ctx2);
  await sb.attach(ctx2);
  const p2 = await ctx2.newPage();
  await p2.goto('/');
  await signIn(p2, 'ana@example.com');
  await tab(p2, 'Historial').click();
  await expect(p2.locator('button.hrow', { hasText: 'Torso A' })).toHaveCount(2);
  await ctx2.close();

  // En el primer dispositivo entra Bea: se ofrece empezar con sus datos y los de Ana no se suben a su cuenta.
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await signIn(page, 'bea@example.com');
  await expect.poll(() => sb.count('user-bea', 'workouts')).toBe(0);
  await tab(page, 'Historial').click();
  await expect(page.locator('button.hrow', { hasText: 'Torso A' })).toHaveCount(0);
  expect(sb.count('user-ana', 'workouts')).toBe(3); // y la cuenta de Ana sigue intacta
});

test('un dispositivo con la hora atrasada no pierde sus cambios', async ({ page, browser, errors }) => {
  void errors;
  const sb = new FakeSupabase();
  await sb.attach(page.context());
  await seed(page, SAMPLE);
  await signIn(page, 'ana@example.com');

  // Segundo móvil con el reloj una hora atrasado.
  const ctx2 = await browser.newContext({ ...test.info().project.use });
  await skipTour(ctx2);
  await ctx2.addInitScript(() => {
    const real = Date.now.bind(Date);
    Date.now = () => real() - 3600_000;
  });
  await sb.attach(ctx2);
  const p2 = await ctx2.newPage();
  await p2.goto('/');
  await signIn(p2, 'ana@example.com');
  const goal = (p: typeof page) => p.getByLabel('Objetivo semanal (entrenos)');
  const goalOnServer = () => ([...sb.rows.values()].find((r) => r.collection === 'settings')?.doc as { weeklyGoal?: number } | undefined)?.weeklyGoal;
  // Primera subida de p2: sirve para medir su desfase con el servidor.
  await goal(p2).selectOption('5');
  await expect.poll(goalOnServer).toBe(5);
  await p2.getByRole('button', { name: 'Sincronizar ahora' }).click();
  // Ana cambia el objetivo en el primer móvil y, después, el segundo móvil lo vuelve a cambiar.
  await page.getByRole('button', { name: 'Sincronizar ahora' }).click();
  await goal(page).selectOption('4');
  await expect.poll(goalOnServer).toBe(4);
  await goal(p2).selectOption('6');
  await expect.poll(goalOnServer).toBe(6); // sin corregir el reloj, este cambio "de hace una hora" perdería
  await ctx2.close();
});
