-- Hub do Carlos — H6: Projetos
-- Pausar (status PAUSED, com a data em paused_at), anotação livre e links por projeto.
-- O texto que já existe em description vira o Objetivo na tela: nada muda no banco.
-- As ações de um projeto pausado continuam como estão; o app só deixa de mostrá-las
-- na Agora, no A fazer e na Central até o projeto ser retomado.
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem duplicar nada.

-- ============================================================
-- 1. Status Pausado + anotação
-- ============================================================

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('ACTIVE', 'PAUSED', 'DONE', 'ARCHIVED'));

alter table public.projects
  add column if not exists paused_at timestamptz,
  add column if not exists notes text,
  add column if not exists notes_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_notes_check') then
    alter table public.projects add constraint projects_notes_check check (char_length(notes) <= 20000);
  end if;
end;
$$;

-- paused_at acompanha o status: marca a data ao pausar, guarda enquanto estiver pausado
-- e limpa ao sair de PAUSED.
create or replace function public.projects_sync_paused()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'PAUSED' then
    if tg_op = 'INSERT' or old.status is distinct from 'PAUSED' then
      new.paused_at := now();
    else
      new.paused_at := coalesce(old.paused_at, now());
    end if;
  else
    new.paused_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_sync_paused on public.projects;
create trigger projects_sync_paused
  before insert or update on public.projects
  for each row execute function public.projects_sync_paused();

-- ============================================================
-- 2. Links do projeto (Figma, Drive, Instagram…)
-- ============================================================

create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  url text not null check (char_length(url) <= 2000 and url ~* '^https?://'),
  created_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

create index if not exists project_links_project_id_idx on public.project_links (project_id);
create index if not exists project_links_user_id_idx on public.project_links (user_id);

alter table public.project_links enable row level security;
drop policy if exists "project_links: dono" on public.project_links;
create policy "project_links: dono" on public.project_links
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- Conferir
-- ============================================================
-- select status, count(*) from public.projects group by status;
-- select count(*) from public.project_links;
