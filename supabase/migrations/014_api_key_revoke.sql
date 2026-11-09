-- Workstation: una API key puede revocarse a sí misma (issue #147). Ejecútalo después de 010.
--
-- Al cerrar sesión ya no hay JWT con el que borrar la fila por RLS, y sin conexión la revocación tiene que
-- quedar pendiente: el móvil la completa más tarde presentando la propia key.
-- Es idempotente: una key que ya no existe devuelve false sin error, para que el reintento termine.
-- No pasa por api_key_user(): una key caducada o sin cuota también debe poder revocarse.

create or replace function public.api_revoke_key(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  n integer;
begin
  delete from public.api_keys where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.api_revoke_key(text) from public;
grant execute on function public.api_revoke_key(text) to anon, authenticated;
