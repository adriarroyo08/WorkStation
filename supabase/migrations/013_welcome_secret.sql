-- Workstation: el disparador de bienvenida se identifica ante la función `welcome` con un secreto compartido.
-- Ejecútalo en Supabase → SQL Editor después de 007, y antes de desplegar la función nueva (la anterior ignora la cabecera).
-- Antes, genera un valor aleatorio (openssl rand -hex 32) y guárdalo en los dos sitios:
--   select vault.create_secret('<valor>', 'welcome_secret');
--   npx supabase secrets set WELCOME_SECRET=<valor> --project-ref <ref>

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'welcome_secret') then
    raise exception 'Falta el secreto de Vault welcome_secret: créalo antes de aplicar esta migración';
  end if;
end;
$$;

create or replace function public.notify_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'welcome_secret');
begin
  if base is not null and secret is not null and new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform net.http_post(
      url := base || '/functions/v1/welcome',
      body := jsonb_build_object('user_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-welcome-secret', secret)
    );
  end if;
  return new;
end;
$$;
