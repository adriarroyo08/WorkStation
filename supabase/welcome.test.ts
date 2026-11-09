// Función `welcome` (con fetch y SMTP simulados) y su disparador real sobre Postgres (PGlite).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWelcomeHandler, SECRET_HEADER } from './functions/welcome/handler';

const SECRET = 'secreto-de-prueba';
const ID = '00000000-0000-0000-0000-00000000000a';
const CONFIRMED = { email: 'ana@example.com', email_confirmed_at: '2026-11-09T10:00:00Z', user_metadata: { full_name: '<b>Ana</b> López' } };

const request = (headers: Record<string, string> = { [SECRET_HEADER]: SECRET }, body: unknown = { user_id: ID }) =>
  new Request('https://example.com/functions/v1/welcome', { method: 'POST', headers, body: JSON.stringify(body) });

// secret: null simula una función sin el secret configurado.
function setup({ user = CONFIRMED as object | null, reserved = true, secret = SECRET as string | null, send = vi.fn(async (_to: string, _html: string) => {}) } = {}) {
  const http = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).includes('/auth/v1/admin/users/')) return user ? Response.json(user) : new Response('{}', { status: 404 });
    if (init?.method === 'POST') return Response.json(reserved ? [{ user_id: ID }] : []);
    return new Response(null, { status: 204 });
  });
  const handler = createWelcomeHandler({ secret: secret ?? undefined, supabaseUrl: 'https://proyecto.test', serviceKey: 'clave', send, fetch: http as typeof fetch });
  return { handler, http, send };
}

describe('función welcome', () => {
  beforeEach(() => void vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => void vi.restoreAllMocks());

  it.each([
    ['sin cabecera', {}, SECRET],
    ['con un secreto incorrecto', { [SECRET_HEADER]: 'otro' }, SECRET],
    ['con un secreto que solo coincide al principio', { [SECRET_HEADER]: SECRET.slice(0, -1) }, SECRET],
    ['si la función no tiene el secreto configurado', { [SECRET_HEADER]: SECRET }, null],
    ['si el secreto configurado está vacío', { [SECRET_HEADER]: '' }, ''],
  ])('responde 401 y no consulta nada %s', async (_caso, headers, secret) => {
    const { handler, http, send } = setup({ secret });
    const res = await handler(request(headers as Record<string, string>));
    expect(res.status).toBe(401);
    expect(http).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('envía el email una vez, con el nombre escapado', async () => {
    const { handler, send } = setup();
    const res = await handler(request());
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const [to, html] = send.mock.calls[0];
    expect(to).toBe('ana@example.com');
    expect(html).toContain('&#60;b&#62;Ana');
    expect(html).not.toContain('<b>Ana');
    expect(html).not.toContain('{{name}}');
  });

  it('rechaza un user_id mal formado sin consultar nada', async () => {
    const { handler, http } = setup();
    const res = await handler(request(undefined, { user_id: '../otra-ruta' }));
    expect(res.status).toBe(400);
    expect(http).not.toHaveBeenCalled();
  });

  it('responde igual exista o no el usuario, y sin enviar si no procede', async () => {
    const sent = await setup().handler(request());
    const expected = [sent.status, await sent.text()];
    for (const opts of [{ user: null }, { user: { email: 'b@example.com', email_confirmed_at: null } }, { reserved: false }]) {
      const { handler, send } = setup(opts);
      const res = await handler(request());
      expect([res.status, await res.text()]).toEqual(expected);
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('el 502 no incluye el texto del error y libera la reserva', async () => {
    const detail = '535 credenciales rechazadas para smtp-usuario';
    const { handler, http } = setup({ send: vi.fn(async () => Promise.reject(new Error(detail))) });
    const res = await handler(request());
    expect(res.status).toBe(502);
    const body = await res.text();
    expect(body).not.toContain('535');
    expect(body).not.toContain('smtp-usuario');
    expect(http).toHaveBeenLastCalledWith(expect.stringContaining(`welcome_sent?user_id=eq.${ID}`), expect.objectContaining({ method: 'DELETE' }));
  });
});

describe('disparador de bienvenida (012)', () => {
  let db: PGlite;
  const sql = (f: string) => readFileSync(new URL(`./migrations/${f}`, import.meta.url), 'utf8');
  const calls = async () => (await db.query<{ url: string; body: { user_id: string }; headers: Record<string, string> }>('select url, body, headers from net.calls')).rows;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create schema auth; create schema extensions; create schema vault; create schema net;
      create role anon; create role authenticated;
      create table auth.users (id uuid primary key, email_confirmed_at timestamptz);
      create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
      insert into vault.decrypted_secrets values ('project_url', 'https://proyecto.test');
      create table net.calls (url text, body jsonb, headers jsonb);
      create function net.http_post(url text, body jsonb, headers jsonb) returns bigint language sql
        as $$ insert into net.calls values (url, body, headers); select 1::bigint $$;
    `);
    // pg_net no existe en PGlite: se sustituye por la función simulada de arriba.
    await db.exec(sql('005_welcome.sql').replace(/create extension if not exists pg_net[^;]*;/, ''));
    await db.exec(sql('007_welcome_revoke.sql'));
  }, 60_000);

  it('no se aplica si falta el secreto en Vault', async () => {
    await expect(db.exec(sql('012_welcome_secret.sql'))).rejects.toThrow(/welcome_secret/);
  });

  it('envía el secreto al confirmarse la cuenta, una sola vez', async () => {
    await db.query(`insert into vault.decrypted_secrets values ('welcome_secret', $1)`, [SECRET]);
    await db.exec(sql('012_welcome_secret.sql'));
    await db.query('insert into auth.users (id) values ($1)', [ID]);
    expect(await calls()).toHaveLength(0);
    await db.query('update auth.users set email_confirmed_at = now() where id = $1', [ID]);
    await db.query(`update auth.users set email_confirmed_at = now() + interval '1 hour' where id = $1`, [ID]);
    const made = await calls();
    expect(made).toHaveLength(1);
    expect(made[0].url).toBe('https://proyecto.test/functions/v1/welcome');
    expect(made[0].body).toEqual({ user_id: ID });
    expect(made[0].headers).toEqual({ 'Content-Type': 'application/json', [SECRET_HEADER]: SECRET });
  });

  it('nadie puede llamar a la función del disparador por RPC', async () => {
    for (const role of ['anon', 'authenticated']) {
      const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, 'public.notify_welcome()', 'execute') as ok`, [role]);
      expect(rows[0].ok).toBe(false);
    }
  });
});
