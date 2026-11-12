-- Workstation: comprobación de API key y caché de noticias compartida entre instancias (issue #149).
-- Ejecútalo ANTES de desplegar la función mcp que la usa. Detalle: docs/mcp-limites.md y docs/recolector-noticias.md.

-- Comprueba una clave sin tocar datos ni contar cuota: la Edge Function la llama una vez por petición HTTP,
-- y contarla reduciría a la mitad las herramientas por minuto de un uso normal (la cuota sigue en api_key_user).
create or replace function public.api_key_check(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.api_keys
    where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
      and (expires_at is null or now() < expires_at)
  )
$$;
revoke all on function public.api_key_check(text) from public;
grant execute on function public.api_key_check(text) to anon, authenticated;

-- Último resultado de cada fuente de noticias. Solo lo toca el servidor con service role:
-- si anon pudiera escribir aquí, cualquiera podría publicar noticias falsas en la app.
create table if not exists public.news_cache (
  source_id text primary key,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz,   -- último éxito real
  attempted_at timestamptz, -- último intento terminado, con éxito o sin él (null: aún ninguno)
  error text,
  lease_until timestamptz   -- una instancia está descargando esta fuente hasta entonces
);
alter table public.news_cache enable row level security; -- sin políticas: solo service role
revoke all on public.news_cache from public, anon, authenticated;
grant select on public.news_cache to service_role;

-- Reserva atómica de la descarga de una fuente: solo una instancia la obtiene, y solo si el último intento ha caducado.
-- La reserva caduca sola para que una instancia caída no bloquee la fuente.
create or replace function public.news_cache_claim(p_source text, p_ttl_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_ts timestamptz := clock_timestamp();
  claimed text;
begin
  insert into public.news_cache as c (source_id, lease_until)
  values (p_source, now_ts + interval '30 seconds')
  on conflict (source_id) do update set lease_until = excluded.lease_until
  where (c.lease_until is null or c.lease_until <= now_ts)
    and (c.attempted_at is null or c.attempted_at <= now_ts - make_interval(secs => p_ttl_seconds))
  returning c.source_id into claimed;
  return claimed is not null;
end $$;
revoke all on function public.news_cache_claim(text, integer) from public, anon, authenticated;
grant execute on function public.news_cache_claim(text, integer) to service_role;

-- Guarda el resultado y libera la reserva. Un fallo consume TTL pero conserva las últimas noticias buenas y su fecha.
create or replace function public.news_cache_store(p_source text, p_items jsonb, p_updated_at timestamptz, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.news_cache as c (source_id, items, updated_at, attempted_at, error, lease_until)
  values (p_source, case when p_error is null then p_items else '[]'::jsonb end, p_updated_at, clock_timestamp(), p_error, null)
  on conflict (source_id) do update set
    items = case when p_error is null then excluded.items else c.items end,
    updated_at = case when p_error is null then excluded.updated_at else c.updated_at end,
    attempted_at = excluded.attempted_at,
    error = excluded.error,
    lease_until = null
$$;
revoke all on function public.news_cache_store(text, jsonb, timestamptz, text) from public, anon, authenticated;
grant execute on function public.news_cache_store(text, jsonb, timestamptz, text) to service_role;
