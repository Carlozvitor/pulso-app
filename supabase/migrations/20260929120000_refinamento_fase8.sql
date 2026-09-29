-- PULSO — Fase 8: refinamento do banco (sem mudança visível no app)

-- ============================================================
-- updated_at só muda quando a pessoa mexe na tarefa
-- ============================================================
-- O motor de prioridade dá +1 por semana parada (updated_at). Antes, qualquer UPDATE
-- zerava essa contagem — inclusive:
--   · trocar a área de um projeto (a propagação regravava todas as tarefas dele);
--   · salvar sem mudar nada (ex.: repetir o mesmo status).
-- Agora: só conta UPDATE direto (profundidade 1 de trigger) que mude algum campo.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() = 1
     and (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

-- ============================================================
-- Índices que faltavam em chaves estrangeiras
-- ============================================================
-- user_id das tabelas de ligação: sem índice, apagar a conta varre as tabelas inteiras
-- (aviso "unindexed foreign keys" do Supabase).

create index if not exists task_tags_user_id_idx on public.task_tags (user_id);
create index if not exists session_tasks_user_id_idx on public.session_tasks (user_id);
