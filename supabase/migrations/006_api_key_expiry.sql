-- Caducidad opcional: las claves existentes conservan expires_at = null.
alter table public.api_keys add column if not exists expires_at timestamptz;

-- Valida también los inserts directos del propietario, sin depender del cliente.
create or replace function public.api_key_validate_expiry()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.expires_at is not null and new.expires_at <= clock_timestamp() then
    raise exception 'Elige una fecha de caducidad futura' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger api_key_validate_expiry before insert on public.api_keys
for each row execute function public.api_key_validate_expiry();

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
  if p_need_write and k.scope <> 'write' then
    raise exception 'Esta API key es de solo lectura' using errcode = '42501';
  end if;
  update public.api_keys set last_used_at = clock_timestamp() where id = k.id;
  return k.user_id;
end $$;

revoke all on function public.api_key_user(text, boolean) from public, anon, authenticated;
