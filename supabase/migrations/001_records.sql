-- Workstation: sincronización entre dispositivos.
-- Pega este archivo en Supabase → SQL Editor → Run (una sola vez).
--
-- Cada fila es un objeto de la app (entreno, rutina, carpeta, ejercicio, medida o ajustes)
-- guardado como JSON. Los usuarios los gestiona Supabase Auth (tabla auth.users).

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection in ('workouts', 'routines', 'folders', 'exercises', 'measurements', 'settings')),
  id text not null,
  doc jsonb,
  deleted boolean not null default false,
  -- Momento del cambio en el dispositivo (decide el conflicto: gana el más reciente).
  client_updated_at timestamptz not null default now(),
  -- Momento en que llegó al servidor (cursor para descargar solo lo nuevo).
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

create index if not exists records_user_updated on public.records (user_id, updated_at);

-- updated_at siempre lo pone el servidor.
create or replace function public.records_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.records_touch();

-- Seguridad: cada usuario solo ve y modifica sus propias filas.
alter table public.records enable row level security;

drop policy if exists "own rows select" on public.records;
drop policy if exists "own rows insert" on public.records;
drop policy if exists "own rows update" on public.records;
drop policy if exists "own rows delete" on public.records;
create policy "own rows select" on public.records for select using (auth.uid() = user_id);
create policy "own rows insert" on public.records for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.records for delete using (auth.uid() = user_id);

-- Tiempo real: avisa a tus otros dispositivos cuando cambias algo.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'records') then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;
