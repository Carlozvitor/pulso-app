-- Hub do Carlos — H7: Treino
-- Simples de propósito: um catálogo de exercícios, os treinos feitos (um registro por
-- exercício: séries × repetições · carga, ou minutos), fichas opcionais e a meta da semana.
-- Treino não é tarefa: o horário da academia é compromisso (com origem Treino) e o que
-- precisa ser feito ("Comprar whey") é ação no PULSO com origem Treino.
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem duplicar nada.

-- ============================================================
-- 1. Exercícios
-- ============================================================

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- Carga (séries × repetições · kg) · Peso do corpo (séries × repetições) · Tempo (minutos).
  kind text not null check (kind in ('LOAD', 'BODYWEIGHT', 'TIME')),
  -- Meta opcional, na unidade do tipo: kg, repetições ou minutos.
  goal numeric(6, 2) check (goal > 0 and goal <= 9999),
  -- Guardado: sai da lista de escolha; o histórico fica.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Um nome por exercício, sem diferença de maiúsculas ("Supino" e "supino" são o mesmo).
create unique index if not exists workout_exercises_name_idx on public.workout_exercises (user_id, lower(name));

drop trigger if exists workout_exercises_set_updated_at on public.workout_exercises;
create trigger workout_exercises_set_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

alter table public.workout_exercises enable row level security;
drop policy if exists "workout_exercises: dono" on public.workout_exercises;
create policy "workout_exercises: dono" on public.workout_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 2. Fichas (opcionais) e os exercícios de cada uma
-- ============================================================

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- Ordem do rodízio (A → B → C).
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists workout_plans_user_id_idx on public.workout_plans (user_id);

drop trigger if exists workout_plans_set_updated_at on public.workout_plans;
create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

alter table public.workout_plans enable row level security;
drop policy if exists "workout_plans: dono" on public.workout_plans;
create policy "workout_plans: dono" on public.workout_plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A ficha guarda os exercícios e a ordem. Os números vêm sempre da última vez.
create table if not exists public.workout_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null,
  exercise_id uuid not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (plan_id, exercise_id),
  constraint workout_plan_items_plan_fk foreign key (plan_id, user_id) references public.workout_plans (id, user_id) on delete cascade,
  constraint workout_plan_items_exercise_fk foreign key (exercise_id, user_id) references public.workout_exercises (id, user_id) on delete cascade
);

create index if not exists workout_plan_items_user_id_idx on public.workout_plan_items (user_id);
create index if not exists workout_plan_items_exercise_id_idx on public.workout_plan_items (exercise_id);

alter table public.workout_plan_items enable row level security;
drop policy if exists "workout_plan_items: dono" on public.workout_plan_items;
create policy "workout_plan_items: dono" on public.workout_plan_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 3. Treinos feitos
-- ============================================================

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- O dia do treino, no fuso do Carlos (o app manda).
  date date not null,
  -- Ficha usada, para o rodízio. Ficha apagada: o treino fica, sem a ligação.
  plan_id uuid,
  started_at timestamptz not null default now(),
  -- Sem data = em andamento.
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint workout_sessions_plan_fk foreign key (plan_id, user_id) references public.workout_plans (id, user_id) on delete set null (plan_id)
);

create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, date);
create index if not exists workout_sessions_plan_id_idx on public.workout_sessions (plan_id);
-- Um treino em andamento por vez.
create unique index if not exists workout_sessions_open_idx on public.workout_sessions (user_id) where finished_at is null;

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;
drop policy if exists "workout_sessions: dono" on public.workout_sessions;
create policy "workout_sessions: dono" on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 4. Registros: um exercício num treino
-- ============================================================

create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null,
  position integer not null default 0,
  -- Uma linha por exercício: 4 × 10 · 40 kg (Carga), 3 × 15 (Peso do corpo) ou 25 min (Tempo).
  sets smallint check (sets between 1 and 99),
  reps smallint check (reps between 1 and 999),
  load_kg numeric(6, 2) check (load_kg > 0 and load_kg <= 9999),
  minutes smallint check (minutes between 1 and 1440),
  -- Marcado como feito. Ao concluir o treino, os não marcados saem.
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, exercise_id),
  constraint workout_entries_session_fk foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade,
  -- Sem "on delete": exercício com registro não é apagado (guarda-se).
  constraint workout_entries_exercise_fk foreign key (exercise_id, user_id) references public.workout_exercises (id, user_id)
);

create index if not exists workout_entries_user_id_idx on public.workout_entries (user_id);
create index if not exists workout_entries_exercise_id_idx on public.workout_entries (exercise_id);

drop trigger if exists workout_entries_set_updated_at on public.workout_entries;
create trigger workout_entries_set_updated_at
  before update on public.workout_entries
  for each row execute function public.set_updated_at();

alter table public.workout_entries enable row level security;
drop policy if exists "workout_entries: dono" on public.workout_entries;
create policy "workout_entries: dono" on public.workout_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 5. Meta da semana
-- ============================================================

create table if not exists public.workout_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Treinos por semana (segunda a domingo). Nulo = sem meta.
  weekly_goal smallint check (weekly_goal between 1 and 7),
  updated_at timestamptz not null default now()
);

drop trigger if exists workout_settings_set_updated_at on public.workout_settings;
create trigger workout_settings_set_updated_at
  before update on public.workout_settings
  for each row execute function public.set_updated_at();

alter table public.workout_settings enable row level security;
drop policy if exists "workout_settings: dono" on public.workout_settings;
create policy "workout_settings: dono" on public.workout_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- Conferir
-- ============================================================
-- select name, kind, goal, archived_at from public.workout_exercises order by name;
-- select date, plan_id, finished_at from public.workout_sessions order by date desc;
-- select weekly_goal from public.workout_settings;
