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
  keyCalls: { method: string; query: string; body: { name?: string; scope?: string; key_hash?: string; expires_at?: string } | null }[] = [];
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
    if (u.pathname === '/rest/v1/api_keys') {
      this.keyCalls.push({ method: req.method(), query: u.search, body: req.postDataJSON() });
      return json([]);
    }
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
  const login = page.getByRole('button', { name: 'Continuar con email' });
  await expect(login.or(page.getByText('Sincronización sin configurar'))).toBeVisible(); // Perfil se carga bajo demanda
  if (!(await login.isVisible())) {
    // Sin Supabase integrado en el build: se conecta el simulado desde Ajustes.
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByPlaceholder('https://xxxx.supabase.co').fill(URL_);
    await page.getByPlaceholder('eyJhbGciOi…').fill('anon-key');
    await page.getByRole('button', { name: 'Conectar con Supabase' }).click();
    await page.getByRole('button', { name: 'Volver' }).click();
  }
  await login.click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

// "Sincronizar ahora" vive en la tarjeta de Perfil; el objetivo semanal, en Ajustes.
const openSettings = (p: Page) => p.getByRole('button', { name: 'Ajustes' }).click();
async function syncNow(p: Page) {
  await p.getByRole('button', { name: 'Volver' }).click();
  await p.getByRole('button', { name: 'Sincronizar ahora' }).click();
  await openSettings(p);
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
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  page.once('dialog', () => expect.soft(false, 'no debe salir un diálogo del navegador').toBe(true));
  const dlg = page.getByRole('dialog', { name: 'Has entrado con otra cuenta' });
  await page.getByRole('button', { name: 'Continuar con email' }).click();
  await page.getByLabel('Email').fill('bea@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await dlg.getByRole('button', { name: 'Empezar de cero' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
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
  await openSettings(page);

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
  await openSettings(p2);
  const goal = (p: typeof page) => p.getByLabel('Objetivo semanal (entrenos)');
  const goalOnServer = () => ([...sb.rows.values()].find((r) => r.collection === 'settings')?.doc as { weeklyGoal?: number } | undefined)?.weeklyGoal;
  // Primera subida de p2: sirve para medir su desfase con el servidor.
  await goal(p2).selectOption('5');
  await expect.poll(goalOnServer).toBe(5);
  await syncNow(p2);
  // Ana cambia el objetivo en el primer móvil y, después, el segundo móvil lo vuelve a cambiar.
  await syncNow(page);
  await goal(page).selectOption('4');
  await expect.poll(goalOnServer).toBe(4);
  await goal(p2).selectOption('6');
  await expect.poll(goalOnServer).toBe(6); // sin corregir el reloj, este cambio "de hace una hora" perdería
  await ctx2.close();
});

// Puente nativo simulado para la key del reloj: guarda lo que recibe, como WatchWorkouts.setUpload.
const DAY = 86_400_000;
type Bridge = { WorkstationNative: Record<string, unknown>; __workstationFromNative: (s: string) => void; __uploads: string[] };
const stubWatch = (page: Page, saved: { user: string; expiry: string; saves: boolean }) =>
  page.addInitScript((s) => {
    const w = window as unknown as Bridge;
    w.__uploads = [];
    let user = s.user;
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
      watchUploadExpiry: () => s.expiry,
      setWatchUpload: (json: string) => {
        w.__uploads.push(json);
        if (!s.saves) return false;
        user = json ? (JSON.parse(json) as { userId: string }).userId : '';
        return true;
      },
    };
  }, saved);
const uploads = (p: Page) => p.evaluate(() => (window as unknown as Bridge).__uploads);

test('con reloj, emite una key de escritura con caducidad y la entrega al móvil', async ({ page, errors }) => {
  void errors;
  const sb = new FakeSupabase();
  await sb.attach(page.context());
  await stubWatch(page, { user: '', expiry: '', saves: true });
  await seed(page, SAMPLE);
  await signIn(page, 'ana@example.com');
  await expect.poll(() => uploads(page)).toHaveLength(1);
  const insert = sb.keyCalls.filter((c) => c.method === 'POST');
  expect(insert).toHaveLength(1);
  expect(insert[0].body).toMatchObject({ name: 'Reloj (subida automática)', scope: 'write' });
  const days = (Date.parse(insert[0].body!.expires_at!) - Date.now()) / DAY;
  expect(days).toBeGreaterThan(89);
  expect(days).toBeLessThanOrEqual(90);
  const [saved] = await uploads(page);
  expect(JSON.parse(saved)).toMatchObject({ userId: 'user-ana', expiresAt: insert[0].body!.expires_at, apiKey: expect.stringMatching(/^ws_/) });
});

test('renueva la key que está a punto de caducar y al cerrar sesión deja la revocación al móvil', async ({ page, errors }) => {
  void errors;
  const sb = new FakeSupabase();
  await sb.attach(page.context());
  await stubWatch(page, { user: 'user-ana', expiry: new Date(Date.now() + 10 * DAY).toISOString(), saves: true });
  await seed(page, SAMPLE);
  await signIn(page, 'ana@example.com');
  await expect.poll(() => uploads(page)).toHaveLength(1);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Continuar con email' })).toBeVisible();
  expect((await uploads(page)).at(-1)).toBe('');
  expect(sb.keyCalls.filter((c) => c.method === 'DELETE')).toHaveLength(0);
});

test('si el móvil no puede guardar la key, no la deja huérfana en el servidor', async ({ page, errors }) => {
  void errors;
  const sb = new FakeSupabase();
  await sb.attach(page.context());
  await stubWatch(page, { user: '', expiry: '', saves: false });
  await seed(page, SAMPLE);
  await signIn(page, 'ana@example.com');
  await expect.poll(() => sb.keyCalls.filter((c) => c.method === 'DELETE').length).toBe(1);
  const hash = sb.keyCalls.find((c) => c.method === 'POST')!.body!.key_hash;
  expect(sb.keyCalls.find((c) => c.method === 'DELETE')!.query).toContain(`key_hash=eq.${hash}`);
});
