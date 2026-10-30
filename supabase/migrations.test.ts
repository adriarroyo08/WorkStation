// Prueba las migraciones SQL reales sobre Postgres (PGlite, en memoria) con un entorno parecido a Supabase:
// esquema auth, auth.uid() a partir del JWT, roles anon/authenticated y la publicación de tiempo real.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

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
    create role anon; create role authenticated;
    grant usage on schema public, auth, extensions to anon, authenticated;
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
});
