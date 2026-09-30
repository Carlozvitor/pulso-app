-- Hub do Carlos — H2: origens
-- As áreas viram a árvore de origens: cada uma pertence a um módulo (Trabalho, Faculdade…)
-- e pode ter subitens (Trabalho → Valentine → Conteúdo). Os ids não mudam: tarefas e
-- projetos continuam ligados onde estavam. Cada item ganha contexto (anotação + links).
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem duplicar nada.

-- ============================================================
-- 1. Colunas novas
-- ============================================================

alter table public.areas
  add column if not exists parent_id uuid,
  add column if not exists module text,
  add column if not exists notes text,
  add column if not exists notes_updated_at timestamptz,
  add column if not exists position integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'areas_module_check') then
    alter table public.areas add constraint areas_module_check
      check (module in ('TRABALHO', 'FACULDADE', 'DINHEIRO', 'TREINO', 'VIDA_PESSOAL'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'areas_notes_check') then
    alter table public.areas add constraint areas_notes_check check (char_length(notes) <= 20000);
  end if;
  -- Apagar um item com subitens é bloqueado: primeiro esvazia. (No action, não restrict:
  -- confere no fim do comando, então apagar a conta — pai e filhos juntos — funciona.)
  if not exists (select 1 from pg_constraint where conname = 'areas_parent_fk') then
    alter table public.areas add constraint areas_parent_fk
      foreign key (parent_id, user_id) references public.areas (id, user_id);
  end if;
end;
$$;

create index if not exists areas_parent_id_idx on public.areas (parent_id);

-- ============================================================
-- 2. Áreas atuais → origens (por pessoa)
-- ============================================================

-- Filho com esse nome embaixo do pai; cria se não existir. Devolve o id.
create or replace function pg_temp.origem(uid uuid, pai uuid, modulo text, nome text, pos integer)
returns uuid
language plpgsql
as $$
declare
  achado uuid;
begin
  select id into achado from public.areas
  where user_id = uid and parent_id = pai and lower(name) = lower(nome)
  limit 1;
  if achado is null then
    insert into public.areas (user_id, parent_id, module, name, position)
    values (uid, pai, modulo, nome, pos)
    returning id into achado;
  end if;
  return achado;
end;
$$;

do $$
declare
  u record;
  m record;
  raiz uuid;
  trabalho uuid;
  valentine uuid;
  clientes uuid;
begin
  for u in select id from auth.users loop
    -- Área com nome de módulo vira a raiz dele (a mais antiga, se houver duas).
    for m in
      select * from (values
        ('TRABALHO', 'Trabalho', array['trabalho']),
        ('FACULDADE', 'Faculdade', array['faculdade']),
        ('DINHEIRO', 'Dinheiro', array['finanças', 'financas', 'dinheiro']),
        ('TREINO', 'Treino', array['treino']),
        ('VIDA_PESSOAL', 'Vida pessoal', array['pessoal', 'vida pessoal'])
      ) as t(modulo, rotulo, nomes)
    loop
      if not exists (
        select 1 from public.areas where user_id = u.id and module = m.modulo and parent_id is null
      ) then
        update public.areas set module = m.modulo, name = m.rotulo
        where id = (
          select id from public.areas
          where user_id = u.id and module is null and parent_id is null and lower(name) = any (m.nomes)
          order by created_at
          limit 1
        );
        -- Módulo sem área correspondente: cria a raiz.
        insert into public.areas (user_id, module, name)
        select u.id, m.modulo, m.rotulo
        where not exists (
          select 1 from public.areas where user_id = u.id and module = m.modulo and parent_id is null
        );
      end if;
    end loop;

    select id into trabalho from public.areas where user_id = u.id and module = 'TRABALHO' and parent_id is null;

    -- Valentine vai para dentro do Trabalho.
    update public.areas set parent_id = trabalho, module = 'TRABALHO'
    where user_id = u.id and module is null and lower(name) = 'valentine';

    -- Qualquer outra área sem módulo fica em Vida pessoal (nada se perde).
    select id into raiz from public.areas where user_id = u.id and module = 'VIDA_PESSOAL' and parent_id is null;
    update public.areas set parent_id = raiz, module = 'VIDA_PESSOAL'
    where user_id = u.id and module is null;

    -- Estrutura inicial do Trabalho (documento mestre, seção 10).
    valentine := pg_temp.origem(u.id, trabalho, 'TRABALHO', 'Valentine', 0);
    update public.areas set position = 0 where id = valentine;
    perform pg_temp.origem(u.id, valentine, 'TRABALHO', 'Conteúdo', 0);
    perform pg_temp.origem(u.id, valentine, 'TRABALHO', 'Administrativo', 1);
    perform pg_temp.origem(u.id, valentine, 'TRABALHO', 'Demandas da empresa', 2);
    perform pg_temp.origem(u.id, valentine, 'TRABALHO', 'Outros', 3);

    clientes := pg_temp.origem(u.id, trabalho, 'TRABALHO', 'Clientes / Freelance', 1);
    perform pg_temp.origem(u.id, clientes, 'TRABALHO', 'Clientes', 0);
    perform pg_temp.origem(u.id, clientes, 'TRABALHO', 'Propostas', 1);
    perform pg_temp.origem(u.id, clientes, 'TRABALHO', 'Entregas', 2);
    perform pg_temp.origem(u.id, clientes, 'TRABALHO', 'Follow-ups', 3);
  end loop;
end;
$$;

alter table public.areas alter column module set not null;

-- Uma raiz por módulo, por pessoa.
create unique index if not exists areas_module_root_idx on public.areas (user_id, module) where parent_id is null;

-- ============================================================
-- 3. Regras da árvore
-- ============================================================
-- · subitem herda o módulo do pai;
-- · raiz não vira subitem, subitem não vira raiz;
-- · mover só dentro do mesmo módulo, e nunca para baixo de si mesmo.

create or replace function public.areas_sync_tree()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if (old.parent_id is null) <> (new.parent_id is null) then
      raise exception 'Módulo não vira subitem, e subitem não vira módulo.' using errcode = 'check_violation';
    end if;
    if old.parent_id is null then
      new.module := old.module;
      return new;
    end if;
  end if;

  if new.parent_id is not null then
    select p.module into new.module from public.areas p where p.id = new.parent_id;

    if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
      if new.module is distinct from old.module then
        raise exception 'Só dá para mover dentro do mesmo módulo.' using errcode = 'check_violation';
      end if;
      if exists (
        with recursive acima as (
          select id, parent_id from public.areas where id = new.parent_id
          union all
          select a.id, a.parent_id from public.areas a join acima on a.id = acima.parent_id
        )
        select 1 from acima where id = new.id
      ) then
        raise exception 'Um item não pode ir para dentro dele mesmo.' using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists areas_sync_tree on public.areas;
create trigger areas_sync_tree
  before insert or update of parent_id, module on public.areas
  for each row execute function public.areas_sync_tree();

-- Módulos (raízes) são criados pelo sistema e não são apagados pelo app.
drop policy if exists "areas: dono" on public.areas;
drop policy if exists "areas: dono lê" on public.areas;
drop policy if exists "areas: dono cria subitem" on public.areas;
drop policy if exists "areas: dono altera" on public.areas;
drop policy if exists "areas: dono apaga subitem" on public.areas;

create policy "areas: dono lê" on public.areas
  for select to authenticated using (user_id = (select auth.uid()));
create policy "areas: dono cria subitem" on public.areas
  for insert to authenticated with check (user_id = (select auth.uid()) and parent_id is not null);
create policy "areas: dono altera" on public.areas
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "areas: dono apaga subitem" on public.areas
  for delete to authenticated using (user_id = (select auth.uid()) and parent_id is not null);

-- Conta nova já nasce com os módulos.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.areas (user_id, module, name)
  values
    (new.id, 'TRABALHO', 'Trabalho'),
    (new.id, 'FACULDADE', 'Faculdade'),
    (new.id, 'DINHEIRO', 'Dinheiro'),
    (new.id, 'TREINO', 'Treino'),
    (new.id, 'VIDA_PESSOAL', 'Vida pessoal');
  return new;
end;
$$;

-- ============================================================
-- 4. Links de contexto
-- ============================================================

create table if not exists public.area_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  url text not null check (char_length(url) <= 2000 and url ~* '^https?://'),
  created_at timestamptz not null default now(),
  foreign key (area_id, user_id) references public.areas (id, user_id) on delete cascade
);

create index if not exists area_links_area_id_idx on public.area_links (area_id);
create index if not exists area_links_user_id_idx on public.area_links (user_id);

alter table public.area_links enable row level security;
drop policy if exists "area_links: dono" on public.area_links;
create policy "area_links: dono" on public.area_links
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- Conferir
-- ============================================================
-- select module, parent_id is null as modulo, name from public.areas order by module, parent_id nulls first, position, name;
