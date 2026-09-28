-- PULSO — schema inicial
-- Regras:
--   · toda tabela tem user_id + RLS (user_id = auth.uid())
--   · FKs entre tabelas do usuário são compostas (id, user_id): impossível apontar para dado de outra pessoa
--   · prioridade NÃO é armazenada — é calculada no app (src/lib/priorities)
--   · enums como CHECK constraints (mais fáceis de evoluir que tipos enum)

-- ============================================================
-- Funções utilitárias
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- profiles (1:1 com auth.users)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: dono lê" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: dono atualiza" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Cria o profile automaticamente no primeiro login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- areas — responsabilidades contínuas (Valentine, Faculdade…)
-- ============================================================

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  icon text,
  color text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create index areas_user_id_idx on public.areas (user_id);

-- ============================================================
-- projects — objetivos com começo e fim
-- ============================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (char_length(description) <= 2000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DONE', 'ARCHIVED')),
  due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id)
);

create index projects_user_id_idx on public.projects (user_id);
create index projects_area_id_idx on public.projects (area_id);

-- ============================================================
-- tasks
-- ============================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  description text check (char_length(description) <= 5000),
  status text not null default 'INBOX'
    check (status in ('INBOX', 'TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED')),
  importance smallint check (importance between 0 and 5),
  urgency smallint check (urgency between 0 and 5),
  energy text check (energy in ('LOW', 'MEDIUM', 'HIGH')),
  estimated_minutes integer check (estimated_minutes between 1 and 1440),
  due_date date,
  project_id uuid,
  area_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete set null (area_id)
);

-- Listas por status (Inbox, Agora) e por prazo (Agenda)
create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_user_due_date_idx on public.tasks (user_id, due_date) where due_date is not null;
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_area_id_idx on public.tasks (area_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- completed_at acompanha o status; área vem do projeto quando houver projeto.
create or replace function public.tasks_sync_derived()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'DONE' then
    if tg_op = 'INSERT' or old.status is distinct from 'DONE' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;

  if new.project_id is not null then
    select p.area_id into new.area_id
    from public.projects p
    where p.id = new.project_id;
  end if;

  return new;
end;
$$;

create trigger tasks_sync_derived
  before insert or update on public.tasks
  for each row execute function public.tasks_sync_derived();

-- Se a área do projeto mudar, as tarefas dele acompanham.
create or replace function public.projects_propagate_area()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.area_id is distinct from old.area_id then
    update public.tasks set area_id = new.area_id where project_id = new.id;
  end if;
  return new;
end;
$$;

create trigger projects_propagate_area
  after update of area_id on public.projects
  for each row execute function public.projects_propagate_area();

-- ============================================================
-- tags (UI fica para depois do MVP)
-- ============================================================

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  unique (id, user_id)
);

create unique index tags_user_name_idx on public.tags (user_id, lower(name));

create table public.task_tags (
  task_id uuid not null,
  tag_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (task_id, tag_id),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  foreign key (tag_id, user_id) references public.tags (id, user_id) on delete cascade
);

create index task_tags_tag_id_idx on public.task_tags (tag_id);

-- ============================================================
-- sessions — "Tenho X minutos"
-- ============================================================

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  available_minutes integer not null check (available_minutes between 1 and 1440),
  energy_level text not null check (energy_level in ('LOW', 'MEDIUM', 'HIGH')),
  unique (id, user_id),
  check (ended_at is null or ended_at >= started_at)
);

create index sessions_user_id_idx on public.sessions (user_id, started_at desc);

create table public.session_tasks (
  session_id uuid not null,
  task_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null check (position >= 0),
  primary key (session_id, task_id),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade,
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create index session_tasks_task_id_idx on public.session_tasks (task_id);

-- ============================================================
-- RLS — cada pessoa só enxerga e altera o que é dela
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['areas', 'projects', 'tasks', 'tags', 'task_tags', 'sessions', 'session_tasks']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: dono" on public.%1$I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;
