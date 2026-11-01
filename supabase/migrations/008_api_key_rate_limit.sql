-- Workstation: límite de peticiones por API key (issue #40). Ejecútalo después de 007.
--
-- Va en la base de datos, dentro de api_key_user(), porque api_records y api_upsert se pueden llamar
-- directamente por /rest/v1/rpc sin pasar por el servidor MCP: un límite solo en el MCP se esquivaría.
-- Contadores compartidos por todas las instancias (tabla), ventanas fijas, sin guardar la clave en claro
-- (se cuenta por api_keys.id). Política y amenazas: docs/mcp-limites.md.

create table if not exists public.api_key_usage (
  key_id uuid not null references public.api_keys (id) on delete cascade,
  span text not null check (span in ('minute', 'hour')),
  window_start timestamptz not null,
  calls integer not null default 0,
  primary key (key_id, span, window_start)
);
alter table public.api_key_usage enable row level security; -- sin políticas: solo las funciones security definer
revoke all on public.api_key_usage from public, anon, authenticated;

-- Reloj del límite. Los tests lo sustituyen para controlar el tiempo.
create or replace function public.api_now()
returns timestamptz
language sql
volatile
set search_path = ''
as $$ select clock_timestamp() $$;
revoke all on function public.api_now() from public, anon, authenticated;

-- Cuenta una llamada de la clave en cada ventana y corta con 429 + Retry-After al pasarse.
-- La excepción deshace el incremento: una petición rechazada no gasta cuota.
create or replace function public.api_key_hit(p_key_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := public.api_now();
  lim record;
  n integer;
  wstart timestamptz;
  retry integer;
begin
  for lim in
    select * from (values ('minute', 60, interval '1 minute'), ('hour', 1000, interval '1 hour')) as l (span, max_calls, len)
  loop
    wstart := date_trunc(lim.span, now_ts);
    insert into public.api_key_usage as u (key_id, span, window_start, calls)
    values (p_key_id, lim.span, wstart, 1)
    on conflict (key_id, span, window_start) do update set calls = u.calls + 1
    returning u.calls into n;
    if n > lim.max_calls then
      retry := greatest(1, ceil(extract(epoch from (wstart + lim.len - now_ts)))::integer);
      -- SQLSTATE PGRST: PostgREST responde con el estado y las cabeceras indicados en detail.
      raise sqlstate 'PGRST' using
        message = json_build_object(
          'code', 'WS429',
          'message', format('Demasiadas peticiones con esta API key (máximo %s por %s). Reintenta en %s s.', lim.max_calls, case lim.span when 'minute' then 'minuto' else 'hora' end, retry)
        )::text,
        detail = json_build_object('status', 429, 'headers', json_build_object('Retry-After', retry::text))::text;
    end if;
  end loop;
  -- Limpieza de ventanas viejas de esta clave (barata: solo sus filas).
  delete from public.api_key_usage where key_id = p_key_id and window_start < now_ts - interval '2 hours';
end $$;
revoke all on function public.api_key_hit(uuid) from public, anon, authenticated;

-- Igual que en 006, más el límite tras validar la clave (las claves falsas no llegan a contar).
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
  if k.expires_at is not null and clock_timestamp() >= k.expires_at then
    raise exception 'API key caducada' using errcode = '28000';
  end if;
  perform public.api_key_hit(k.id);
  if p_need_write and k.scope <> 'write' then
    raise exception 'Esta API key es de solo lectura' using errcode = '42501';
  end if;
  update public.api_keys set last_used_at = clock_timestamp() where id = k.id;
  return k.user_id;
end $$;
revoke all on function public.api_key_user(text, boolean) from public, anon, authenticated;
