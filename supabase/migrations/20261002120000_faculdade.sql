-- Hub do Carlos — H4: Faculdade
-- Disciplinas são origens dentro de Faculdade (anotação + links = materiais).
-- Avaliação (trabalho, prova, atividade) é contexto, não tarefa: tem disciplina, data,
-- horário, valor e nota. Uma ação do PULSO pode ser ligada a uma avaliação (opcional).
-- Disciplina encerrada fica guardada, fora do seletor de origem e da Central.
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem duplicar nada.

-- ============================================================
-- 1. Encerrar disciplina
-- ============================================================

alter table public.areas add column if not exists archived_at timestamptz;

do $$
begin
  -- Módulo (raiz) não encerra.
  if not exists (select 1 from pg_constraint where conname = 'areas_archive_check') then
    alter table public.areas add constraint areas_archive_check check (parent_id is not null or archived_at is null);
  end if;
end;
$$;

-- ============================================================
-- 2. Avaliações
-- ============================================================

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid not null,
  kind text not null check (kind in ('TRABALHO', 'PROVA', 'ATIVIDADE')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  -- Sem data: fica na disciplina, fora da agenda.
  due_date date,
  due_time time,
  location text check (char_length(location) <= 200),
  -- Quanto vale e a nota (sem média: cada faculdade tem sua regra).
  max_grade numeric(6, 2) check (max_grade > 0 and max_grade <= 1000),
  grade numeric(6, 2) check (grade >= 0 and grade <= 1000),
  notes text check (char_length(notes) <= 5000),
  -- Trabalho/atividade entregue. Prova não usa: passa sozinha depois do dia.
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- Sem "on delete": disciplina com avaliações não pode ser apagada (encerra-se).
  constraint assessments_area_fk foreign key (area_id, user_id) references public.areas (id, user_id),
  check (due_time is null or due_date is not null)
);

create index if not exists assessments_user_id_idx on public.assessments (user_id);
create index if not exists assessments_area_id_idx on public.assessments (area_id);

drop trigger if exists assessments_set_updated_at on public.assessments;
create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- A avaliação pertence a uma disciplina: um item dentro de Faculdade (não o módulo).
create or replace function public.assessments_check_area()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.areas a
    where a.id = new.area_id and a.module = 'FACULDADE' and a.parent_id is not null
  ) then
    raise exception 'A avaliação precisa de uma disciplina da Faculdade.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists assessments_check_area on public.assessments;
create trigger assessments_check_area
  before insert or update of area_id on public.assessments
  for each row execute function public.assessments_check_area();

alter table public.assessments enable row level security;
drop policy if exists "assessments: dono" on public.assessments;
create policy "assessments: dono" on public.assessments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 3. Ação ligada a uma avaliação
-- ============================================================

alter table public.tasks add column if not exists assessment_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_assessment_fk') then
    alter table public.tasks add constraint tasks_assessment_fk
      foreign key (assessment_id, user_id) references public.assessments (id, user_id) on delete set null (assessment_id);
  end if;
end;
$$;

create index if not exists tasks_assessment_id_idx on public.tasks (assessment_id);

-- Campos derivados da tarefa. Novo nesta fase:
-- · ligou a uma avaliação → a origem passa a ser a disciplina dela (e sai do projeto);
-- · mudou de origem ou de projeto depois → a ligação com a avaliação sai.
create or replace function public.tasks_sync_derived()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_now boolean;
  assessment_area uuid;
begin
  if new.status = 'DONE' then
    if tg_op = 'INSERT' or old.status is distinct from 'DONE' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;

  -- Pausada só existe em "A fazer": começar, concluir ou arquivar tira a marca.
  if new.status <> 'TODO' then
    new.paused_at := null;
  end if;

  -- "Agora não" acaba quando a tarefa é começada, concluída ou arquivada.
  if new.status in ('IN_PROGRESS', 'DONE', 'ARCHIVED') then
    new.snoozed_until := null;
  end if;

  linked_now := new.assessment_id is not null
    and (tg_op = 'INSERT' or new.assessment_id is distinct from old.assessment_id);

  if linked_now then
    new.project_id := null;
    select a.area_id into new.area_id from public.assessments a where a.id = new.assessment_id;
  end if;

  if new.project_id is not null then
    select p.area_id into new.area_id
    from public.projects p
    where p.id = new.project_id;
  end if;

  if new.assessment_id is not null and not linked_now then
    select a.area_id into assessment_area from public.assessments a where a.id = new.assessment_id;
    if new.area_id is distinct from assessment_area then
      new.assessment_id := null;
    end if;
  end if;

  return new;
end;
$$;

-- Avaliação trocou de disciplina: as ações ligadas vão junto.
create or replace function public.assessments_propagate_area()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.area_id is distinct from old.area_id then
    update public.tasks set area_id = new.area_id where assessment_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists assessments_propagate_area on public.assessments;
create trigger assessments_propagate_area
  after update of area_id on public.assessments
  for each row execute function public.assessments_propagate_area();

-- ============================================================
-- Conferir
-- ============================================================
-- select name, archived_at from public.areas where module = 'FACULDADE' order by parent_id nulls first, position;
-- select kind, title, due_date, due_time, grade, max_grade, done_at from public.assessments order by due_date;
