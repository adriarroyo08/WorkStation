-- Workstation: notify_welcome() es la función del disparador de bienvenida, no una RPC.
-- Se quita del API público (/rest/v1/rpc). El disparador sigue funcionando: el permiso EXECUTE
-- solo se comprueba al crear el disparador, no cada vez que salta.
revoke all on function public.notify_welcome() from public, anon, authenticated;
