-- PULSO — Pausar e "Agora não"

-- paused_at: tarefa pausada (status TODO + marca). Retomar = começar de novo.
-- snoozed_until: "Agora não" — fora da Agora até essa data; continua em A fazer.
alter table public.tasks
  add column if not exists paused_at timestamptz,
  add column if not exists snoozed_until date;

-- Campos derivados: as marcas somem sozinhas quando deixam de fazer sentido.
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

  -- Pausada só existe em "A fazer": começar, concluir ou arquivar tira a marca.
  if new.status <> 'TODO' then
    new.paused_at := null;
  end if;

  -- "Agora não" acaba quando a tarefa é começada, concluída ou arquivada.
  if new.status in ('IN_PROGRESS', 'DONE', 'ARCHIVED') then
    new.snoozed_until := null;
  end if;

  if new.project_id is not null then
    select p.area_id into new.area_id
    from public.projects p
    where p.id = new.project_id;
  end if;

  return new;
end;
$$;
