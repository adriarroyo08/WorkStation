-- Workstation: API keys personales para que una IA (vía MCP) lea o escriba tus datos.
-- Ejecútalo en Supabase → SQL Editor después de 001_records.sql.
--
-- La app genera la key (ws_…), la muestra una sola vez y guarda aquí solo su hash SHA-256.
-- Las funciones api_* validan la key y operan únicamente sobre las filas de su dueño.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'IA',
  key_hash text not null unique,
  key_prefix text not null, -- primeros caracteres, para reconocerla en la lista
  scope text not null default 'read' check (scope in ('read', 'write')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_keys enable row level security;
drop policy if exists "own keys select" on public.api_keys;
drop policy if exists "own keys insert" on public.api_keys;
drop policy if exists "own keys delete" on public.api_keys;
create policy "own keys select" on public.api_keys for select using (auth.uid() = user_id);
create policy "own keys insert" on public.api_keys for insert with check (auth.uid() = user_id);
create policy "own keys delete" on public.api_keys for delete using (auth.uid() = user_id);

-- Resuelve una key a su usuario (y anota el último uso). Uso interno.
create or replace function public.api_key_user(p_key text, p_need_write boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  k public.api_keys;
begin
  select * into k from public.api_keys where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex');
  if k.id is null then
    raise exception 'API key no válida' using errcode = '28000';
  end if;
  if p_need_write and k.scope <> 'write' then
    raise exception 'Esta API key es de solo lectura' using errcode = '42501';
  end if;
  update public.api_keys set last_used_at = now() where id = k.id;
  return k.user_id;
end $$;

revoke all on function public.api_key_user(text, boolean) from public, anon, authenticated;

-- Lectura: todos los registros del usuario (o solo los cambiados desde p_since).
create or replace function public.api_records(p_key text, p_since timestamptz default null)
returns table (collection text, id text, doc jsonb, deleted boolean, client_updated_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := public.api_key_user(p_key, false);
begin
  return query
    select r.collection, r.id, r.doc, r.deleted, r.client_updated_at, r.updated_at
    from public.records r
    where r.user_id = uid and (p_since is null or r.updated_at > p_since)
    order by r.updated_at;
end $$;

-- Escritura (solo keys con scope 'write'): p_rows = [{collection, id, doc, deleted, client_updated_at}]
create or replace function public.api_upsert(p_key text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := public.api_key_user(p_key, true);
  n integer;
begin
  insert into public.records (user_id, collection, id, doc, deleted, client_updated_at)
  select uid, x.collection, x.id, x.doc, coalesce(x.deleted, false), coalesce(x.client_updated_at, now())
  from jsonb_to_recordset(p_rows) as x(collection text, id text, doc jsonb, deleted boolean, client_updated_at timestamptz)
  on conflict (user_id, collection, id) do update
    set doc = excluded.doc, deleted = excluded.deleted, client_updated_at = excluded.client_updated_at
    where public.records.client_updated_at <= excluded.client_updated_at;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.api_records(text, timestamptz) to anon, authenticated;
grant execute on function public.api_upsert(text, jsonb) to anon, authenticated;
