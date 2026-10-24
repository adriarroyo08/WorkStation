-- Workstation: refuerzo de la sincronización (ejecútalo después de 001 y 002, una sola vez).
--
-- 1. "Gana el cambio más reciente" también en el servidor: si llega una versión más antigua de un registro
--    (un dispositivo que estuvo sin conexión), se conserva la actual en vez de sobrescribirla.
-- 2. updated_at estrictamente creciente por usuario: cada fila de una misma subida recibe un instante distinto,
--    así el cursor de descarga no se salta filas que compartían la hora de la transacción.

create or replace function public.records_touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.client_updated_at < old.client_updated_at then
    return old; -- cambio más antiguo que el guardado: se ignora
  end if;
  -- Estrictamente creciente por usuario (como mínimo 1 µs después de su última fila): el cursor de descarga
  -- nunca encuentra dos filas con el mismo instante. Usa el índice (user_id, updated_at).
  new.updated_at := greatest(
    clock_timestamp(),
    coalesce((select max(r.updated_at) from public.records r where r.user_id = new.user_id), '-infinity') + interval '1 microsecond'
  );
  return new;
end $$;

-- Lectura paginada para el servidor MCP (la API devuelve como mucho 1000 filas por llamada).
create or replace function public.api_records(p_key text, p_since timestamptz default null, p_limit integer default 1000)
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
    order by r.updated_at
    limit least(greatest(p_limit, 1), 1000);
end $$;

drop function if exists public.api_records(text, timestamptz);
grant execute on function public.api_records(text, timestamptz, integer) to anon, authenticated;
