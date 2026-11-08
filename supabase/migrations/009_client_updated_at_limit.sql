-- Workstation: acota client_updated_at a la hora del servidor (issue #143). Ejecútalo después de 008, una sola vez.
--
-- "Gana el cambio más reciente" se decide con la fecha que envía cada dispositivo. Desde aquí, esa fecha nunca
-- queda más de 5 minutos por delante del servidor: de sobra para el desfase normal de un reloj.
--
-- Se recorta en vez de rechazar: un dispositivo con el reloj muy adelantado sigue guardando sus cambios y la app
-- no recibe ningún error nuevo que gestionar. Dos subidas seguidas conservan su orden, porque el tope solo avanza.
--
-- Va en el trigger porque todas las escrituras pasan por él. También api_upsert: su `excluded` ya trae la fecha
-- recortada por el BEFORE INSERT, así que su comparación no necesita cambios.

begin;

create or replace function public.records_touch() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_client timestamptz := clock_timestamp() + interval '5 minutes';
begin
  if new.client_updated_at > max_client then
    new.client_updated_at := max_client;
  end if;
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

-- Las filas ya guardadas por encima del tope pasan a la hora en que llegaron al servidor. Solo cambia esa fecha:
-- sin el trigger, updated_at no se mueve y los dispositivos no tienen que volver a descargar nada.
alter table public.records disable trigger records_touch;
update public.records set client_updated_at = updated_at where client_updated_at > clock_timestamp() + interval '5 minutes';
alter table public.records enable trigger records_touch;

commit;
