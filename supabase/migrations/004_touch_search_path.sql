-- Workstation: fija el search_path del trigger records_touch (aviso del linter de Supabase).
-- Ejecútalo después de 003_sync_hardening.sql, una sola vez.

alter function public.records_touch() set search_path = '';
