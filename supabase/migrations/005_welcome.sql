-- Workstation: email de bienvenida cuando una cuenta queda confirmada (por el enlace del email o al entrar con Google).
-- Ejecútalo en Supabase → SQL Editor después de 004. Necesita la función `welcome` desplegada y el secreto de Vault
-- `project_url` (https://<ref>.supabase.co): select vault.create_secret('https://<ref>.supabase.co', 'project_url');

create extension if not exists pg_net with schema extensions;

-- Cuentas a las que ya se mandó: la función solo envía una vez por usuario.
create table if not exists public.welcome_sent (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table public.welcome_sent enable row level security; -- sin políticas: solo la función (service role)

create or replace function public.notify_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
begin
  if base is not null and new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform net.http_post(
      url := base || '/functions/v1/welcome',
      body := jsonb_build_object('user_id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.notify_welcome();
