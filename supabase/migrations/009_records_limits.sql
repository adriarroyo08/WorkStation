-- Workstation: límites de almacenamiento por documento y por usuario (issue #142). Ejecútalo después de 008.
--
-- Van en disparadores para cubrir por igual la sesión normal y api_upsert. Referencia de tamaños (jsonb::text):
-- entreno normal con pulso ~9 KB, entreno extremo (40 ejercicios x 20 series, notas largas) ~160 KB; 5.000 entrenos
-- con pulso y 10 años de medidas diarias son ~9.000 filas y ~50 MB. Los errores usan SQLSTATE PGRST, como en 008:
-- WS413 (documento o llamada demasiado grandes) y WS403 (cuota agotada). La PWA los reconoce por esos códigos
-- (shared/sync-limits.ts); si cambias un código, cámbialo también allí.

-- Uso de cada usuario: contar con count(*) y sum() en cada escritura sería lineal, y además no serializa.
create table if not exists public.records_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rows_used integer not null default 0,
  bytes_used bigint not null default 0
);
alter table public.records_usage enable row level security; -- sin políticas: solo las funciones security definer
revoke all on public.records_usage from public, anon, authenticated;

-- Tope por documento, antes de escribir: un documento rechazado no llega a ocupar espacio.
-- Se llama records_doc_size para ejecutarse antes que records_touch (los disparadores van por orden alfabético).
create or replace function public.records_doc_size() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_doc_bytes constant integer := 1048576; -- 1 MiB
begin
  if octet_length(new.doc::text) > max_doc_bytes then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'WS413', 'message', 'Este registro es demasiado grande para la nube (máximo 1 MB).')::text,
      detail = json_build_object('status', 413, 'headers', json_build_object())::text;
  end if;
  return new;
end $$;
revoke all on function public.records_doc_size() from public, anon, authenticated;

drop trigger if exists records_doc_size on public.records;
create trigger records_doc_size before insert or update on public.records
for each row execute function public.records_doc_size();

-- Cuota por usuario, al final de cada sentencia: el contador se bloquea lo último, así dos subidas simultáneas no
-- se interbloquean, y ese bloqueo hace que no se cuele ninguna fila de más. Solo se rechaza lo que hace crecer el
-- uso: quien esté por encima de la cuota puede seguir editando sin crecer y borrando.
-- Las filas borradas (deleted = true) cuentan como fila, pero no ocupan bytes de documento.
create or replace function public.records_track_usage() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_rows constant integer := 50000;
  max_bytes constant bigint := 209715200; -- 200 MiB
  changes text := case tg_op
    when 'INSERT' then 'select user_id, 1 as n, coalesce(octet_length(doc::text), 0) as b from new_rows'
    when 'DELETE' then 'select user_id, -1 as n, -coalesce(octet_length(doc::text), 0) as b from old_rows'
    else 'select user_id, 0 as n, coalesce(octet_length(doc::text), 0) as b from new_rows
          union all select user_id, 0 as n, -coalesce(octet_length(doc::text), 0) as b from old_rows'
  end;
  c record;
  rows_now integer;
  bytes_now bigint;
begin
  for c in execute 'select user_id, sum(n)::integer as n, sum(b)::bigint as b from (' || changes || ') t group by user_id order by user_id' loop
    if tg_op = 'DELETE' then
      -- Sin insert: en un borrado en cascada de la cuenta el contador puede haber desaparecido ya.
      update public.records_usage u set rows_used = greatest(0, u.rows_used + c.n), bytes_used = greatest(0, u.bytes_used + c.b) where u.user_id = c.user_id;
      continue;
    end if;
    insert into public.records_usage as u (user_id, rows_used, bytes_used)
    values (c.user_id, greatest(0, c.n), greatest(0, c.b))
    on conflict (user_id) do update set rows_used = greatest(0, u.rows_used + c.n), bytes_used = greatest(0, u.bytes_used + c.b)
    returning u.rows_used, u.bytes_used into rows_now, bytes_now;
    if (c.n > 0 and rows_now > max_rows) or (c.b > 0 and bytes_now > max_bytes) then
      raise sqlstate 'PGRST' using
        message = json_build_object('code', 'WS403', 'message', 'Has alcanzado el límite de datos de tu cuenta en la nube.')::text,
        detail = json_build_object('status', 403, 'headers', json_build_object())::text;
    end if;
  end loop;
  return null;
end $$;
revoke all on function public.records_track_usage() from public, anon, authenticated;

-- Tres disparadores porque las tablas de transición no admiten varios eventos en uno solo.
-- En un upsert, cada fila aparece solo en el que le corresponde (insertada o actualizada).
drop trigger if exists records_usage_insert on public.records;
create trigger records_usage_insert after insert on public.records
referencing new table as new_rows
for each statement execute function public.records_track_usage();

drop trigger if exists records_usage_update on public.records;
create trigger records_usage_update after update on public.records
referencing old table as old_rows new table as new_rows
for each statement execute function public.records_track_usage();

drop trigger if exists records_usage_delete on public.records;
create trigger records_usage_delete after delete on public.records
referencing old table as old_rows
for each statement execute function public.records_track_usage();

-- Uso de los datos que ya existen, después de crear los disparadores (que bloquean las escrituras hasta el final
-- de la transacción). No se rechaza ni se modifica ninguna fila existente.
insert into public.records_usage as u (user_id, rows_used, bytes_used)
select r.user_id, count(*)::integer, coalesce(sum(octet_length(r.doc::text)), 0)::bigint
from public.records r
group by r.user_id
on conflict (user_id) do update set rows_used = excluded.rows_used, bytes_used = excluded.bytes_used;

-- Igual que en 002, más el tope de filas por llamada (tras validar la clave). Cada documento pasa además por los
-- disparadores de arriba. El origen "nube" del MCP trocea sus escrituras (shared/cloud-source.ts).
create or replace function public.api_upsert(p_key text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := public.api_key_user(p_key, true);
  max_rows constant integer := 1000;
  n integer;
begin
  if jsonb_typeof(p_rows) = 'array' and jsonb_array_length(p_rows) > max_rows then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'WS413', 'message', format('Demasiados registros en una sola llamada (máximo %s).', max_rows))::text,
      detail = json_build_object('status', 413, 'headers', json_build_object())::text;
  end if;
  insert into public.records (user_id, collection, id, doc, deleted, client_updated_at)
  select uid, x.collection, x.id, x.doc, coalesce(x.deleted, false), coalesce(x.client_updated_at, now())
  from jsonb_to_recordset(p_rows) as x(collection text, id text, doc jsonb, deleted boolean, client_updated_at timestamptz)
  on conflict (user_id, collection, id) do update
    set doc = excluded.doc, deleted = excluded.deleted, client_updated_at = excluded.client_updated_at
    where public.records.client_updated_at <= excluded.client_updated_at;
  get diagnostics n = row_count;
  return n;
end $$;
