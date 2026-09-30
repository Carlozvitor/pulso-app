-- Hub do Carlos — H3: compromissos
-- Agenda = quando algo acontece (não é tarefa). Um compromisso tem dia, horário (ou dia todo),
-- duração, local e origem. Pode se repetir toda semana em dias escolhidos, com fim opcional;
-- "só este" sai da repetição pela lista de dias pulados.
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem duplicar nada.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 5000),
  location text check (char_length(location) <= 200),
  area_id uuid,
  start_date date not null,
  -- Sem horário = dia todo (e aí não tem duração).
  start_time time,
  duration_minutes integer check (duration_minutes between 1 and 1440),
  -- Dias da semana da repetição (0 = domingo … 6 = sábado). Vazio/nulo = não repete.
  repeat_days smallint[] check (repeat_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  repeat_until date,
  -- Ocorrências tiradas da repetição ("só este": apagado ou virou compromisso avulso).
  skipped_dates date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id),
  check (start_time is not null or duration_minutes is null),
  check (repeat_until is null or repeat_until >= start_date)
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_area_id_idx on public.events (area_id);
create index if not exists events_start_date_idx on public.events (start_date);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;
drop policy if exists "events: dono" on public.events;
create policy "events: dono" on public.events
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
