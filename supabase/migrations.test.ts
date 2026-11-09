// Prueba las migraciones SQL reales sobre Postgres (PGlite, en memoria) con un entorno parecido a Supabase:
// esquema auth, auth.uid() a partir del JWT, roles anon/authenticated y la publicación de tiempo real.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { performanceData } from '../shared/perf-data';
import { snapshot } from '../shared/sync';
import { DEFAULT_SETTINGS } from '../shared/types';

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const KEY_R = 'ws_lectura';
const KEY_W = 'ws_escritura';
let db: PGlite;

const sql = (f: string) => readFileSync(new URL(`./migrations/${f}`, import.meta.url), 'utf8');
// Ejecuta como un usuario autenticado de Supabase (RLS activa).
async function as<T>(uid: string, q: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role authenticated; select set_config('request.jwt.claim.sub', '${uid}', true);`);
    return (await tx.query<T>(q, params)).rows;
  });
}
async function anon<T>(q: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.exec('set local role anon;');
    return (await tx.query<T>(q, params)).rows;
  });
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create schema auth; create schema extensions;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public, auth, extensions to anon, authenticated, service_role;
    create publication supabase_realtime;
    insert into auth.users values ('${A}'), ('${B}');
  `);
  for (const f of ['001_records.sql', '002_api_keys.sql', '003_sync_hardening.sql', '004_touch_search_path.sql']) await db.exec(sql(f));
  await db.exec(`grant select, insert, update, delete on public.records, public.api_keys to authenticated;`);
  await db.query(
    `insert into public.api_keys (user_id, key_hash, key_prefix, scope) values ($1, encode(extensions.digest($2, 'sha256'), 'hex'), 'ws_l', 'read'), ($1, encode(extensions.digest($3, 'sha256'), 'hex'), 'ws_e', 'write')`,
    [A, KEY_R, KEY_W],
  );
  await db.exec(sql('006_api_key_expiry.sql'));
  await db.exec(sql('008_api_key_rate_limit.sql'));
  // Fila anterior a la 009 con una fecha fuera de rango: la migración debe dejarla editable.
  await db.query(`insert into public.records (user_id, collection, id, doc, client_updated_at) values ($1, 'workouts', 'legado', '{"v":"antes"}', '9999-01-01T00:00:00Z')`, [A]);
  await db.exec(sql('009_client_updated_at_limit.sql'));
  await db.exec(sql('010_records_limits.sql'));
  await db.exec(sql('012_api_key_check_news_cache.sql'));
}, 60_000);

const upsert = (uid: string, id: string, doc: object, ts: string) =>
  as(
    uid,
    `insert into public.records (collection, id, doc, client_updated_at) values ('workouts', $1, $2, $3) on conflict (user_id, collection, id) do update set doc = excluded.doc, client_updated_at = excluded.client_updated_at`,
    [id, doc, ts],
  );

describe('migraciones de Supabase', () => {
  it('gana el cambio más reciente aunque llegue tarde una versión antigua', async () => {
    await upsert(A, 'w1', { v: 'nuevo' }, '2026-10-20T10:00:00Z');
    await upsert(A, 'w1', { v: 'viejo' }, '2026-10-19T10:00:00Z'); // dispositivo que estuvo sin conexión
    expect((await as<{ doc: { v: string } }>(A, `select doc from public.records where id = 'w1'`))[0].doc.v).toBe('nuevo');
    await upsert(A, 'w1', { v: 'más nuevo' }, '2026-10-21T10:00:00Z');
    expect((await as<{ doc: { v: string } }>(A, `select doc from public.records where id = 'w1'`))[0].doc.v).toBe('más nuevo');
  });

  it('cada fila de una misma subida recibe un updated_at distinto', async () => {
    await as(A, `insert into public.records (collection, id, doc) select 'workouts', 'b' || g, '{}' from generate_series(1, 50) g`);
    const rows = await as<{ updated_at: string }>(A, `select updated_at::text from public.records where id like 'b%'`);
    expect(new Set(rows.map((r) => String(r.updated_at))).size).toBe(50);
  });

  it('RLS: cada usuario solo ve y toca sus filas', async () => {
    await upsert(B, 'privado', { v: 'de B' }, '2026-10-20T10:00:00Z');
    expect(await as(A, `select * from public.records where id = 'privado'`)).toHaveLength(0);
    await as(A, `update public.records set doc = '{"hack":1}' where id = 'privado'`);
    expect((await as<{ doc: object }>(B, `select doc from public.records where id = 'privado'`))[0].doc).toEqual({ v: 'de B' });
    expect(await anon(`select * from public.records`).catch(() => [])).toHaveLength(0);
  });

  it('API keys: lectura paginada y escritura solo con permiso', async () => {
    const page = await anon<{ id: string }>(`select * from public.api_records($1, null, 10)`, [KEY_R]);
    expect(page).toHaveLength(10);
    // Como Supabase: updated_at como texto con microsegundos (un Date de JS solo guarda milisegundos).
    const all = await anon<{ id: string; updated_at: string }>(`select id, updated_at::text from public.api_records($1)`, [KEY_R]);
    expect(all.length).toBeGreaterThan(50);
    expect(all.some((r) => r.id === 'privado')).toBe(false); // filas de B, no
    const rest = await anon(`select * from public.api_records($1, $2::timestamptz)`, [KEY_R, all[9].updated_at]);
    expect(rest).toHaveLength(all.length - 10);
    await expect(anon(`select public.api_upsert($1, '[{"collection":"workouts","id":"x","doc":{}}]')`, [KEY_R])).rejects.toThrow(/solo lectura/);
    await expect(anon(`select * from public.api_records('ws_falsa')`)).rejects.toThrow(/no válida/);
    const [{ api_upsert: n }] = await anon<{ api_upsert: number }>(`select public.api_upsert($1, '[{"collection":"workouts","id":"ia","doc":{"v":1},"client_updated_at":"2026-10-20T10:00:00Z"}]')`, [
      KEY_W,
    ]);
    expect(n).toBe(1);
    expect(await as(A, `select * from public.records where id = 'ia'`)).toHaveLength(1);
    await expect(anon(`select public.api_key_user($1, false)`, [KEY_R])).rejects.toThrow(/permission denied/);
  });
  it('conserva las claves existentes sin caducidad y guarda solo el hash', async () => {
    const rows = await as<{ expires_at: null; key_hash: string }>(A, 'select expires_at, key_hash from public.api_keys');
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.expires_at === null && /^[a-f0-9]{64}$/.test(r.key_hash))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(KEY_R);
    expect(await as(B, 'select * from public.api_keys')).toHaveLength(0);
  });

  it('valida la caducidad futura en inserts directos y mantiene el aislamiento', async () => {
    await expect(as(A, `insert into public.api_keys (key_hash, key_prefix, expires_at) values ('pasada', 'ws_', now())`)).rejects.toThrow(/futura/);
    await expect(as(A, `insert into public.api_keys (user_id, key_hash, key_prefix) values ($1, 'ajena', 'ws_')`, [B])).rejects.toThrow(/row-level security/);
  });

  it.each(['read', 'write'])('RPC directos: vigencia, caducidad, revocación y permisos %s', async (scope) => {
    const key = `ws_temporal_${scope}`;
    await db.query(
      `insert into public.api_keys (user_id, key_hash, key_prefix, scope, expires_at)
      values ($1, encode(extensions.digest($2, 'sha256'), 'hex'), 'ws_tmp', $3, clock_timestamp() + interval '1 hour')`,
      [A, key, scope],
    );
    await anon('select * from public.api_records($1)', [key]);
    const write = () => anon(`select public.api_upsert($1, '[{"collection":"workouts","id":"temporal-${scope}","doc":{}}]')`, [key]);
    if (scope === 'write') await write();
    else await expect(write()).rejects.toThrow(/solo lectura/);
    const hash = `encode(extensions.digest($1, 'sha256'), 'hex')`;
    const before = (await db.query(`select last_used_at::text from public.api_keys where key_hash = ${hash}`, [key])).rows;
    await db.query(`update public.api_keys set expires_at = clock_timestamp() - interval '1 second' where key_hash = ${hash}`, [key]);
    for (const role of ['anon', 'authenticated']) {
      const call = role === 'anon' ? anon : <T>(q: string, params: unknown[]) => as<T>(B, q, params);
      await expect(call('select * from public.api_records($1)', [key])).rejects.toThrow(/caducada/);
      await expect(call(`select public.api_upsert($1, '[]')`, [key])).rejects.toThrow(/caducada/);
    }
    expect((await db.query(`select last_used_at::text from public.api_keys where key_hash = ${hash}`, [key])).rows).toEqual(before);
    await as(A, 'delete from public.api_keys where key_prefix = $1 and scope = $2', ['ws_tmp', scope]);
    await expect(anon('select * from public.api_records($1)', [key])).rejects.toThrow(/no válida/);
    await expect(write()).rejects.toThrow(/no válida/);
  });

  it('rechaza el límite exacto de caducidad en ambos RPC', async () => {
    // Reloj SQL fijo para comprobar la igualdad, sin esperas ni carreras de milisegundos.
    await db.transaction(async (tx) => {
      await tx.exec('alter function public.api_key_user(text, boolean) set search_path = public, extensions, pg_catalog');
      await tx.exec(`create function public.clock_timestamp() returns timestamptz language sql as $$ select '2026-10-30T12:00:00Z'::timestamptz $$;`);
      await tx.query(
        `insert into public.api_keys (user_id, key_hash, key_prefix, scope, expires_at)
        values ($1, encode(extensions.digest('ws_limite', 'sha256'), 'hex'), 'ws_lim', 'write', '2099-10-30T12:00:01Z')`,
        [A],
      );
      await tx.exec(`update public.api_keys set expires_at = '2026-10-30T12:00:00Z' where key_prefix = 'ws_lim';`);
      // Cada error revierte solo su savepoint, conservando el reloj dentro de esta transacción.
      for (const q of ["select * from public.api_records('ws_limite')", "select public.api_upsert('ws_limite', '[]')"]) {
        await tx.exec('savepoint boundary');
        await expect(tx.query(q)).rejects.toThrow(/caducada/);
        await tx.exec('rollback to savepoint boundary');
      }
      await tx.exec('drop function public.clock_timestamp(); alter function public.api_key_user(text, boolean) set search_path = public, extensions');
    });
  });

  describe('límite por API key (008)', () => {
    const KEY_L = 'ws_rl_limite_8f2';
    const KEY_O = 'ws_rl_otra_8f2';
    // Reloj controlado: api_now() lee el ajuste test.now.
    const at = (iso: string) => db.exec(`select set_config('test.now', '${iso}', false)`);
    const call = (key: string) => anon(`select count(*) from public.api_records($1)`, [key]);
    const usage = () =>
      db.query<{ span: string; calls: number }>(`select span, calls from public.api_key_usage u join public.api_keys k on k.id = u.key_id where k.key_prefix = 'ws_rl8' order by span`);

    beforeAll(async () => {
      await db.exec(`create or replace function public.api_now() returns timestamptz language sql volatile set search_path = '' as $$ select current_setting('test.now')::timestamptz $$`);
      await db.query(
        `insert into public.api_keys (user_id, key_hash, key_prefix, scope) values ($1, encode(extensions.digest($2, 'sha256'), 'hex'), 'ws_rl8', 'write'), ($1, encode(extensions.digest($3, 'sha256'), 'hex'), 'ws_ro8', 'read')`,
        [B, KEY_L, KEY_O],
      );
    });
    afterAll(() => db.exec(`create or replace function public.api_now() returns timestamptz language sql volatile set search_path = '' as $$ select clock_timestamp() $$`));

    it('deja 60 por minuto, corta la 61 con 429 y Retry-After y no gasta cuota al rechazar', async () => {
      await at('2026-11-02T10:00:15Z');
      for (let i = 0; i < 60; i++) await call(KEY_L);
      const err = await call(KEY_L).catch((e: { message: string; detail?: string; code?: string }) => e);
      expect((err as { code?: string }).code).toBe('PGRST');
      expect(JSON.parse((err as { message: string }).message)).toMatchObject({ code: 'WS429' });
      expect(JSON.parse((err as { detail: string }).detail)).toEqual({ status: 429, headers: { 'Retry-After': '45' } });
      await expect(call(KEY_L)).rejects.toThrow(/Demasiadas peticiones/);
      expect((await usage()).rows).toEqual([
        { span: 'hour', calls: 60 },
        { span: 'minute', calls: 60 },
      ]);
    });

    it('la ventana se reinicia al minuto siguiente', async () => {
      await at('2026-11-02T10:01:00Z');
      await expect(call(KEY_L)).resolves.toBeDefined();
    });

    it('cada clave tiene su propio contador', async () => {
      await at('2026-11-02T10:01:30Z');
      for (let i = 0; i < 59; i++) await call(KEY_L);
      await expect(call(KEY_L)).rejects.toThrow(/Demasiadas/);
      await expect(call(KEY_O)).resolves.toBeDefined();
    });

    it('también limita las escrituras y el tope por hora', async () => {
      await at('2026-11-02T10:05:00Z');
      await db.exec(`update public.api_key_usage set calls = 1000 where span = 'hour' and key_id = (select id from public.api_keys where key_prefix = 'ws_rl8')`);
      await expect(anon(`select public.api_upsert($1, '[]')`, [KEY_L])).rejects.toThrow(/máximo 1000 por hora/);
      await at('2026-11-02T11:00:00Z');
      await expect(anon(`select public.api_upsert($1, '[]')`, [KEY_L])).resolves.toBeDefined();
    });

    it('con llamadas simultáneas no se cuela ninguna de más', async () => {
      await at('2026-11-02T12:00:00Z');
      const r = await Promise.allSettled(Array.from({ length: 70 }, () => call(KEY_L)));
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(60);
    });

    it('nadie de fuera ve los contadores ni puede llamar al límite o al reloj', async () => {
      await expect(anon(`select * from public.api_key_usage`)).rejects.toThrow(/permission denied/);
      await expect(as(B, `select * from public.api_key_usage`)).rejects.toThrow(/permission denied/);
      await expect(anon(`select public.api_key_hit(gen_random_uuid())`)).rejects.toThrow(/permission denied/);
      await expect(anon(`select public.api_now()`)).rejects.toThrow(/permission denied/);
    });

    it('al revocar la clave se borran sus contadores y deja de valer', async () => {
      await at('2026-11-02T13:00:00Z');
      await db.query(`delete from public.api_keys where key_prefix = 'ws_rl8'`);
      expect((await usage()).rows).toEqual([]);
      await expect(call(KEY_L)).rejects.toThrow(/no válida/);
    });
  });

  describe('límites de almacenamiento (010)', () => {
    const C = '00000000-0000-0000-0000-00000000000c';
    const D = '00000000-0000-0000-0000-00000000000d';
    const KEY_C = 'ws_cuota_009';
    const MiB = 1024 * 1024;
    const docOf = (bytes: number) => ({ relleno: 'x'.repeat(bytes) });
    const usage = async (uid: string) => (await db.query<{ rows_used: number; bytes_used: string }>(`select rows_used, bytes_used::text from public.records_usage where user_id = $1`, [uid])).rows[0];
    const real = async (uid: string) =>
      (await db.query<{ rows_used: number; bytes_used: string }>(`select count(*)::int as rows_used, coalesce(sum(octet_length(doc::text)), 0)::text as bytes_used from public.records where user_id = $1`, [uid])).rows[0];
    const setUsage = (uid: string, rows: number, bytes = 0) => db.query(`update public.records_usage set rows_used = $2, bytes_used = $3 where user_id = $1`, [uid, rows, bytes]);
    const rpcRow = (id: string, doc: object) => JSON.stringify([{ collection: 'workouts', id, doc, client_updated_at: '2026-11-01T10:00:00Z' }]);
    const rejection = (p: Promise<unknown>) => p.then(() => null, (e: { code?: string; message: string; detail?: string }) => e);

    beforeAll(async () => {
      await db.query(`insert into auth.users values ($1), ($2)`, [C, D]);
      await db.query(`insert into public.api_keys (user_id, key_hash, key_prefix, scope) values ($1, encode(extensions.digest($2, 'sha256'), 'hex'), 'ws_c09', 'write')`, [C, KEY_C]);
    });

    it('rechaza por sesión un documento por encima del tope, con error que PostgREST traduce a 413', async () => {
      const err = await rejection(upsert(C, 'grande', docOf(MiB + 1), '2026-11-01T10:00:00Z'));
      expect(err?.code).toBe('PGRST');
      expect(JSON.parse(err!.message)).toMatchObject({ code: 'WS413' });
      expect(JSON.parse(err!.detail!)).toMatchObject({ status: 413 });
      expect(await as(C, `select 1 from public.records where id = 'grande'`)).toHaveLength(0);
    });

    it('rechaza por API key un documento por encima del tope', async () => {
      await expect(anon(`select public.api_upsert($1, $2::jsonb)`, [KEY_C, rpcRow('grande-rpc', docOf(MiB + 1))])).rejects.toThrow(/WS413/);
      expect(await as(C, `select 1 from public.records where id = 'grande-rpc'`)).toHaveLength(0);
    });

    it('acepta un entreno extremo y documentos justo por debajo del tope', async () => {
      const set = { type: 'normal', weight: 102.5, reps: 10, repsMin: 8, rpe: 8.5, done: true };
      const extreme = {
        id: 'extremo',
        name: 'Entreno extremo',
        startedAt: '2026-11-01T10:00:00Z',
        notes: 'n'.repeat(2000),
        exercises: Array.from({ length: 40 }, () => ({ exerciseId: 'press-banca-inclinado', notes: 'n'.repeat(2000), restSec: 120, sets: Array.from({ length: 20 }, () => set) })),
        heartRate: { avg: 130, max: 180, min: 90, samples: Array.from({ length: 360 }, (_, i) => [i * 5, 140]) },
      };
      await upsert(C, 'extremo', extreme, '2026-11-01T10:00:00Z');
      await upsert(C, 'casi-tope', docOf(MiB - 100), '2026-11-01T10:00:00Z');
      expect(await as(C, `select 1 from public.records where id in ('extremo', 'casi-tope')`)).toHaveLength(2);
    });

    it('el historial sintético de referencia cabe con margen amplio en todos los límites', async () => {
      const E = '00000000-0000-0000-0000-00000000000e';
      await db.query(`insert into auth.users values ($1)`, [E]);
      const rows = [...snapshot(performanceData(DEFAULT_SETTINGS))].map(([key, json]) => ({ collection: key.split(':')[0], id: key.split(':').slice(1).join(':'), doc: JSON.parse(json) }));
      await as(E, `insert into public.records (collection, id, doc) select x.collection, x.id, x.doc from jsonb_to_recordset($1::jsonb) as x(collection text, id text, doc jsonb)`, [JSON.stringify(rows)]);
      const [{ biggest }] = await as<{ biggest: number }>(E, `select max(octet_length(doc::text))::int as biggest from public.records`);
      const used = await usage(E);
      expect(used).toEqual(await real(E));
      expect(used.rows_used).toBe(rows.length);
      const MARGIN = 20;
      expect(biggest * MARGIN).toBeLessThan(MiB);
      expect(used.rows_used * MARGIN).toBeLessThan(50000);
      expect(Number(used.bytes_used) * MARGIN).toBeLessThan(200 * MiB);
    });

    it('lleva la cuenta exacta al insertar, actualizar, ignorar lo antiguo, marcar como borrado y borrar', async () => {
      const check = async () => expect(await usage(D)).toEqual(await real(D));
      await upsert(D, 'u1', { v: 'uno' }, '2026-11-01T10:00:00Z');
      await upsert(D, 'u2', { v: 'dos' }, '2026-11-01T10:00:00Z');
      await check();
      await upsert(D, 'u1', { v: 'uno, ahora bastante más largo' }, '2026-11-01T11:00:00Z');
      await check();
      await upsert(D, 'u1', { v: 'antiguo, que se ignora aunque sea mucho más largo que el actual' }, '2026-10-01T10:00:00Z');
      await check();
      await as(D, `insert into public.records (collection, id, doc, deleted, client_updated_at) values ('workouts', 'u2', null, true, '2026-11-01T12:00:00Z') on conflict (user_id, collection, id) do update set doc = excluded.doc, deleted = excluded.deleted, client_updated_at = excluded.client_updated_at`);
      await check();
      expect((await usage(D)).rows_used).toBe(2);
      await as(D, `delete from public.records where id = 'u1'`);
      await check();
    });

    it('al llenar la cuota rechaza las filas nuevas, pero deja editar y borrar', async () => {
      await upsert(D, 'existente', { v: 1 }, '2026-11-01T10:00:00Z');
      const before = await usage(D);
      await setUsage(D, 50000, Number(before.bytes_used));
      const err = await rejection(upsert(D, 'nueva', { v: 1 }, '2026-11-01T10:00:00Z'));
      expect(err?.code).toBe('PGRST');
      expect(JSON.parse(err!.message)).toMatchObject({ code: 'WS403', message: expect.stringMatching(/límite de datos/) });
      expect(JSON.parse(err!.detail!)).toMatchObject({ status: 403 });
      expect(await as(D, `select 1 from public.records where id = 'nueva'`)).toHaveLength(0);
      expect((await usage(D)).rows_used).toBe(50000); // el rechazo no gasta cuota
      await upsert(D, 'existente', { v: 2 }, '2026-11-01T11:00:00Z');
      expect((await as<{ doc: { v: number } }>(D, `select doc from public.records where id = 'existente'`))[0].doc.v).toBe(2);
      await as(D, `delete from public.records where id = 'existente'`);
      expect((await usage(D)).rows_used).toBe(49999);
      await upsert(D, 'cabe-otra', { v: 1 }, '2026-11-01T10:00:00Z');
      expect((await usage(D)).rows_used).toBe(50000);
    });

    it('la cuota de bytes rechaza lo que crece y permite lo que encoge, también por API key', async () => {
      await upsert(C, 'crece', { t: 'abc' }, '2026-11-01T10:00:00Z');
      await setUsage(C, 10, 209715200);
      await expect(anon(`select public.api_upsert($1, $2::jsonb)`, [KEY_C, rpcRow('crece', { t: 'abcdefghijklmnopqrstuvwxyz' })])).rejects.toThrow(/WS403/);
      await expect(anon(`select public.api_upsert($1, $2::jsonb)`, [KEY_C, rpcRow('crece', { t: 'a' })])).resolves.toBeDefined();
      await setUsage(C, 10, 0);
    });

    it('un lote que supera la cuota no guarda ninguna de sus filas', async () => {
      await setUsage(D, 49999, 0);
      await expect(as(D, `insert into public.records (collection, id, doc) select 'workouts', 'lote' || g, '{}' from generate_series(1, 2) g`)).rejects.toThrow(/WS403/);
      expect(await as(D, `select 1 from public.records where id like 'lote%'`)).toHaveLength(0);
      await db.query(`update public.records_usage u set rows_used = r.n, bytes_used = r.b from (select count(*)::int n, coalesce(sum(octet_length(doc::text)), 0) b from public.records where user_id = $1) r where u.user_id = $1`, [D]);
    });

    it('api_upsert limita las filas por llamada', async () => {
      const rows = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ collection: 'workouts', id: `tope-${i}`, doc: {}, client_updated_at: '2026-11-01T10:00:00Z' })));
      await expect(anon(`select public.api_upsert($1, $2::jsonb)`, [KEY_C, rows(1001)])).rejects.toThrow(/WS413/);
      expect(await as(C, `select 1 from public.records where id like 'tope-%'`)).toHaveLength(0);
      const [{ api_upsert: n }] = await anon<{ api_upsert: number }>(`select public.api_upsert($1, $2::jsonb)`, [KEY_C, rows(1000)]);
      expect(n).toBe(1000);
      await expect(anon(`select public.api_upsert('ws_falsa', $1::jsonb)`, [rows(1001)])).rejects.toThrow(/no válida/);
    });

    it('al aplicarse sobre datos existentes los conserva intactos y calcula su uso, incluso uno mayor que el tope', async () => {
      await db.exec(`alter table public.records disable trigger user`);
      await db.query(`insert into public.records (user_id, collection, id, doc) values ($1, 'workouts', 'antiguo-enorme', $2)`, [C, docOf(2 * MiB)]);
      await db.exec(`alter table public.records enable trigger user`);
      const before = await db.query(`select user_id, collection, id, md5(doc::text) as h, deleted, client_updated_at, updated_at from public.records order by 1, 2, 3`);
      await db.exec(sql('010_records_limits.sql'));
      expect((await db.query(`select user_id, collection, id, md5(doc::text) as h, deleted, client_updated_at, updated_at from public.records order by 1, 2, 3`)).rows).toEqual(before.rows);
      expect(await usage(C)).toEqual(await real(C));
      expect(await usage(A)).toEqual(await real(A));
      expect(await as(C, `select 1 from public.records where id = 'antiguo-enorme'`)).toHaveLength(1);
      await as(C, `update public.records set doc = null, deleted = true, client_updated_at = '2026-11-02T10:00:00Z' where id = 'antiguo-enorme'`);
      expect(await usage(C)).toEqual(await real(C));
    });

    it('nadie de fuera ve ni toca los contadores y al borrar la cuenta desaparecen sin error', async () => {
      await expect(as(C, `select * from public.records_usage`)).rejects.toThrow(/permission denied/);
      await expect(anon(`update public.records_usage set rows_used = 0`)).rejects.toThrow(/permission denied/);
      await db.query(`delete from auth.users where id = $1`, [D]);
      expect(await usage(D)).toBeUndefined();
      expect((await real(D)).rows_used).toBe(0);
    });
  });

  describe('comprobación de clave y caché de noticias (012)', () => {
    const service = <T>(q: string, params: unknown[] = []): Promise<T[]> =>
      db.transaction(async (tx) => {
        await tx.exec('set local role service_role;');
        return (await tx.query<T>(q, params)).rows;
      });
    const check = async (key: string) => (await anon<{ ok: boolean }>(`select public.api_key_check($1) as ok`, [key]))[0].ok;
    const claim = async (source: string, ttl = 3600) => (await service<{ ok: boolean }>(`select public.news_cache_claim($1, $2) as ok`, [source, ttl]))[0].ok;
    const store = (source: string, items: unknown[], updatedAt: string | null, error: string | null = null) =>
      service(`select public.news_cache_store($1, $2::jsonb, $3::timestamptz, $4)`, [source, JSON.stringify(items), updatedAt, error]);
    const row = async (source: string) => (await db.query<{ items: unknown[]; updated_at: Date | null; error: string | null; lease_until: Date | null }>(`select * from public.news_cache where source_id = $1`, [source])).rows[0];

    it('api_key_check acepta claves vigentes y rechaza falsas, nulas y caducadas', async () => {
      expect(await check(KEY_R)).toBe(true);
      expect(await check('ws_inventada')).toBe(false);
      expect((await anon<{ ok: boolean }>(`select public.api_key_check(null) as ok`))[0].ok).toBe(false);
      await db.query(`insert into public.api_keys (user_id, key_hash, key_prefix, scope) values ($1, encode(extensions.digest('ws_caducada', 'sha256'), 'hex'), 'ws_c', 'read')`, [A]);
      expect(await check('ws_caducada')).toBe(true);
      await db.exec(`update public.api_keys set expires_at = now() - interval '1 second' where key_prefix = 'ws_c'`);
      expect(await check('ws_caducada')).toBe(false);
    });

    it('api_key_check no gasta cuota ni marca la clave como usada', async () => {
      const state = async () => (await db.query<{ calls: string; used: Date | null }>(`select (select coalesce(sum(calls), 0) from public.api_key_usage) as calls, (select last_used_at from public.api_keys where key_prefix = 'ws_l') as used`)).rows[0];
      const before = await state();
      await check(KEY_R);
      expect(await state()).toEqual(before);
    });

    it('news_cache está cerrada para anon y authenticated, en lectura y en escritura', async () => {
      await expect(anon(`select * from public.news_cache`)).rejects.toThrow(/permission denied/);
      await expect(as(A, `select * from public.news_cache`)).rejects.toThrow(/permission denied/);
      await expect(anon(`select public.news_cache_claim('x', 3600)`)).rejects.toThrow(/permission denied/);
      await expect(as(A, `select public.news_cache_store('x', '[]'::jsonb, null)`)).rejects.toThrow(/permission denied/);
      expect(await service(`select * from public.news_cache`)).toEqual([]);
    });

    it('solo una instancia obtiene la reserva, también a la vez', async () => {
      const results = await Promise.all([claim('a'), claim('a'), claim('a')]);
      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('la reserva caduca sola si la instancia desaparece', async () => {
      expect(await claim('b')).toBe(true);
      expect(await claim('b')).toBe(false);
      await db.exec(`update public.news_cache set lease_until = clock_timestamp() - interval '1 second' where source_id = 'b'`);
      expect(await claim('b')).toBe(true);
    });

    it('guardar libera la reserva y un resultado reciente no se vuelve a descargar hasta el TTL', async () => {
      expect(await claim('c')).toBe(true);
      await store('c', [{ id: '1' }], '2026-11-09T10:00:00Z');
      expect(await row('c')).toMatchObject({ items: [{ id: '1' }], error: null, lease_until: null });
      expect(await claim('c')).toBe(false);
      await db.exec(`update public.news_cache set attempted_at = clock_timestamp() - interval '3601 seconds' where source_id = 'c'`);
      expect(await claim('c')).toBe(true);
    });

    it('un fallo consume TTL y conserva las noticias y la fecha anteriores', async () => {
      await store('d', [{ id: 'bueno' }], '2026-11-09T10:00:00Z');
      await db.exec(`update public.news_cache set attempted_at = clock_timestamp() - interval '3601 seconds' where source_id = 'd'`);
      expect(await claim('d')).toBe(true);
      await store('d', [], null, 'Fuente no disponible');
      const saved = await row('d');
      expect(saved.items).toEqual([{ id: 'bueno' }]);
      expect(saved.updated_at).toEqual(new Date('2026-11-09T10:00:00Z'));
      expect(saved.error).toBe('Fuente no disponible');
      expect(await claim('d')).toBe(false);
    });

    it('un primer fallo sin fila previa no guarda noticias', async () => {
      expect(await claim('e')).toBe(true);
      await store('e', [{ id: 'ignorado' }], null, 'Fuente no disponible');
      expect((await row('e')).items).toEqual([]);
    });
  });

  describe('client_updated_at acotado (009)', () => {
    const KEY = 'ws_acotar_143';
    const FAR = '9999-01-01T00:00:00Z';
    const T0 = Date.parse('2026-03-01T10:00:00Z'); // en el pasado: updated_at sigue siendo real y creciente
    const iso = (ms: number) => new Date(ms).toISOString();
    const MIN = 60_000;
    // Reloj controlado solo dentro de records_touch: el resto de funciones sigue usando pg_catalog.
    const at = (ms: number) => db.exec(`select set_config('test.clock', '${iso(ms)}', false)`);
    const row = async (id: string) => {
      const [r] = await as<{ doc: { v: string }; client_updated_at: Date; updated_at: Date }>(A, `select doc, client_updated_at, updated_at from public.records where id = $1`, [id]);
      return { v: r.doc.v, ts: r.client_updated_at.toISOString(), updated: r.updated_at.toISOString() };
    };
    const apiUpsert = (key: string, id: string, v: string, ts: string) =>
      anon(`select public.api_upsert($1, $2::jsonb)`, [key, JSON.stringify([{ collection: 'workouts', id, doc: { v }, client_updated_at: ts }])]);

    beforeAll(async () => {
      await db.exec(`
        create function public.clock_timestamp() returns timestamptz language sql as $$ select current_setting('test.clock')::timestamptz $$;
        alter function public.records_touch() set search_path = public, pg_catalog;
      `);
      await db.query(`insert into public.api_keys (user_id, key_hash, key_prefix, scope) values ($1, encode(extensions.digest($2, 'sha256'), 'hex'), 'ws_143', 'write')`, [A, KEY]);
    });
    afterAll(() => db.exec(`drop function public.clock_timestamp(); alter function public.records_touch() set search_path = ''`));

    it('recorta al margen una fecha muy futura, por la app y por api_upsert', async () => {
      await at(T0);
      await upsert(A, 'tope-app', { v: 'app' }, FAR);
      await apiUpsert(KEY, 'tope-api', 'api', FAR);
      expect(await row('tope-app')).toMatchObject({ v: 'app', ts: iso(T0 + 5 * MIN) });
      expect(await row('tope-api')).toMatchObject({ v: 'api', ts: iso(T0 + 5 * MIN) });
    });

    it('recorta también al actualizar una fila existente', async () => {
      await at(T0);
      await upsert(A, 'tope-update', { v: '1' }, iso(T0));
      await apiUpsert(KEY, 'tope-update', '2', FAR);
      expect(await row('tope-update')).toMatchObject({ v: '2', ts: iso(T0 + 5 * MIN) });
    });

    it('no toca las fechas dentro del desfase normal del reloj', async () => {
      await at(T0);
      await upsert(A, 'desfase-adelantado', { v: 'a' }, iso(T0 + 4 * MIN));
      await upsert(A, 'desfase-atrasado', { v: 'b' }, iso(T0 - 60 * MIN));
      await apiUpsert(KEY, 'desfase-limite', 'c', iso(T0 + 5 * MIN - 1000)); // aún dentro del margen
      expect((await row('desfase-adelantado')).ts).toBe(iso(T0 + 4 * MIN));
      expect((await row('desfase-atrasado')).ts).toBe(iso(T0 - 60 * MIN));
      expect((await row('desfase-limite')).ts).toBe(iso(T0 + 5 * MIN - 1000));
    });

    it('un reloj muy adelantado sigue guardando sus cambios y en orden, sin error', async () => {
      const ahead = 3 * 60 * MIN;
      await at(T0);
      await expect(upsert(A, 'adelantado', { v: 'primero' }, iso(T0 + ahead))).resolves.toBeDefined();
      await at(T0 + MIN);
      await expect(upsert(A, 'adelantado', { v: 'segundo' }, iso(T0 + MIN + ahead))).resolves.toBeDefined();
      expect(await row('adelantado')).toMatchObject({ v: 'segundo', ts: iso(T0 + MIN + 5 * MIN) });
    });

    it('sigue ignorando una versión antigua que llega tarde', async () => {
      await at(T0);
      await upsert(A, 'tarde', { v: 'nuevo' }, iso(T0));
      await upsert(A, 'tarde', { v: 'viejo' }, iso(T0 - 60 * MIN));
      expect(await row('tarde')).toMatchObject({ v: 'nuevo', ts: iso(T0) });
    });

    it('tras revocar una key, las ediciones del usuario vuelven a ganar pasado el margen', async () => {
      const revocada = 'ws_revocada_143';
      await db.query(`insert into public.api_keys (user_id, key_hash, key_prefix, scope) values ($1, encode(extensions.digest($2, 'sha256'), 'hex'), 'ws_rev', 'write')`, [A, revocada]);
      await at(T0);
      await upsert(A, 'revocada', { v: 'del usuario' }, iso(T0));
      await at(T0 + 10_000);
      await apiUpsert(revocada, 'revocada', 'de la key', FAR);
      expect(await row('revocada')).toMatchObject({ v: 'de la key', ts: iso(T0 + 10_000 + 5 * MIN) });

      await as(A, `delete from public.api_keys where key_prefix = 'ws_rev'`);
      await expect(apiUpsert(revocada, 'revocada', 'otra vez', FAR)).rejects.toThrow(/no válida/);

      const after = T0 + 10_000 + 5 * MIN + 1000;
      await at(after);
      await upsert(A, 'revocada', { v: 'editada' }, iso(after));
      expect(await row('revocada')).toMatchObject({ v: 'editada', ts: iso(after) });
    });

    it('la migración deja editables las filas que ya estaban fuera de rango, sin tocar su contenido', async () => {
      const legacy = await row('legado');
      expect(legacy.v).toBe('antes');
      expect(legacy.ts).toBe(legacy.updated); // fecha reparada: la hora en que llegó al servidor
      const now = Date.now();
      await at(now);
      await upsert(A, 'legado', { v: 'editada' }, iso(now));
      expect((await row('legado')).v).toBe('editada');
    });
  });
});
