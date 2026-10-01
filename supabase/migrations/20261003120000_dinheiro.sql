-- Hub do Carlos — H5: Dinheiro
-- Pessoal e simples: entradas, gastos, contas fixas, cartões (faturas e parcelas) e
-- pagamentos futuros. Valores em centavos (inteiro). Nada disso é tarefa: pagar vira
-- ação no PULSO só quando o Carlos decide ("Virar ação"), ligada pela tabela money_tasks.
--
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem duplicar nada.

-- ============================================================
-- 1. Cartões
-- ============================================================

create table if not exists public.money_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- Dia do fechamento e do vencimento (em mês curto, vale o último dia).
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  credit_limit_cents integer check (credit_limit_cents > 0),
  -- Guardado: some das listas e da escolha, mas as compras continuam contando.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists money_cards_user_id_idx on public.money_cards (user_id);

drop trigger if exists money_cards_set_updated_at on public.money_cards;
create trigger money_cards_set_updated_at
  before update on public.money_cards
  for each row execute function public.set_updated_at();

alter table public.money_cards enable row level security;
drop policy if exists "money_cards: dono" on public.money_cards;
create policy "money_cards: dono" on public.money_cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 2. Contas fixas
-- ============================================================

create table if not exists public.money_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  -- Valor previsto; em conta que varia (luz), é o aproximado.
  amount_cents integer not null check (amount_cents > 0),
  variable boolean not null default false,
  due_day smallint not null check (due_day between 1 and 31),
  category text not null check (category in ('ALIMENTACAO', 'TRANSPORTE', 'CASA', 'CONTAS', 'SAUDE', 'LAZER', 'COMPRAS', 'EDUCACAO', 'OUTROS')),
  -- No cartão: entra sozinha na fatura todo mês (não precisa marcar como paga).
  card_id uuid,
  -- Vale do mês de starts_on até o mês de ends_on (sem fim = continua).
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint money_bills_card_fk foreign key (card_id, user_id) references public.money_cards (id, user_id) on delete set null (card_id),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists money_bills_user_id_idx on public.money_bills (user_id);

drop trigger if exists money_bills_set_updated_at on public.money_bills;
create trigger money_bills_set_updated_at
  before update on public.money_bills
  for each row execute function public.set_updated_at();

alter table public.money_bills enable row level security;
drop policy if exists "money_bills: dono" on public.money_bills;
create policy "money_bills: dono" on public.money_bills
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 3. Movimentações: entradas, gastos e pagamentos futuros
-- ============================================================

create table if not exists public.money_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('IN', 'OUT')),
  -- Parcelado: o valor total da compra.
  amount_cents integer not null check (amount_cents > 0),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  category text not null,
  -- Data da compra, do recebimento, do pagamento ou (futuro) de quando vence.
  date date not null,
  -- Como pagou. Sem forma = só "pago" (conta fixa, pagamento futuro).
  method text check (method in ('PIX', 'DINHEIRO', 'DEBITO', 'CARTAO')),
  card_id uuid,
  installments smallint not null default 1 check (installments between 1 and 24),
  -- Pagamento de uma conta fixa: de qual conta e de qual mês (dia 1).
  bill_id uuid,
  bill_month date,
  -- Pagamento futuro que ainda não foi pago.
  planned boolean not null default false,
  approximate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint money_entries_card_fk foreign key (card_id, user_id) references public.money_cards (id, user_id),
  -- Conta apagada: o pagamento continua como gasto do mês dele (bill_month fica), sem a ligação.
  constraint money_entries_bill_fk foreign key (bill_id, user_id) references public.money_bills (id, user_id) on delete set null (bill_id),
  constraint money_entries_category_check check (
    (kind = 'OUT' and category in ('ALIMENTACAO', 'TRANSPORTE', 'CASA', 'CONTAS', 'SAUDE', 'LAZER', 'COMPRAS', 'EDUCACAO', 'OUTROS'))
    or (kind = 'IN' and category in ('SALARIO', 'FREELA', 'OUTRO'))
  ),
  -- Entrada é só valor, data e tipo.
  constraint money_entries_in_check check (
    kind = 'OUT' or (method is null and card_id is null and installments = 1 and bill_id is null and not planned)
  ),
  -- Cartão ⇔ forma "CARTAO"; parcelas só no cartão.
  constraint money_entries_card_check check ((method = 'CARTAO') = (card_id is not null) and (installments = 1 or card_id is not null)),
  constraint money_entries_bill_check check ((bill_id is null or bill_month is not null) and (bill_month is null or extract(day from bill_month) = 1)),
  -- Pagamento futuro: sem forma de pagamento e sem ligação com conta fixa.
  constraint money_entries_planned_check check (not planned or (method is null and bill_id is null)),
  constraint money_entries_approximate_check check (not approximate or planned)
);

create index if not exists money_entries_user_date_idx on public.money_entries (user_id, date);
create index if not exists money_entries_card_id_idx on public.money_entries (card_id);
-- Uma conta fixa é paga uma vez por mês.
create unique index if not exists money_entries_bill_month_key on public.money_entries (bill_id, bill_month) where bill_id is not null;

drop trigger if exists money_entries_set_updated_at on public.money_entries;
create trigger money_entries_set_updated_at
  before update on public.money_entries
  for each row execute function public.set_updated_at();

alter table public.money_entries enable row level security;
drop policy if exists "money_entries: dono" on public.money_entries;
create policy "money_entries: dono" on public.money_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 4. Faturas pagas
-- ============================================================

-- A fatura é calculada (compras + parcelas + contas no cartão); aqui fica só "paga".
-- Pagar a fatura não cria gasto: as compras já estão lançadas.
create table if not exists public.money_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid not null,
  -- Mês em que a fatura vence (dia 1).
  month date not null check (extract(day from month) = 1),
  paid_at timestamptz not null default now(),
  unique (card_id, month),
  constraint money_invoice_payments_card_fk foreign key (card_id, user_id) references public.money_cards (id, user_id) on delete cascade
);

create index if not exists money_invoice_payments_user_id_idx on public.money_invoice_payments (user_id);

alter table public.money_invoice_payments enable row level security;
drop policy if exists "money_invoice_payments: dono" on public.money_invoice_payments;
create policy "money_invoice_payments: dono" on public.money_invoice_payments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 5. Ação do PULSO ligada a uma conta, fatura ou pagamento futuro
-- ============================================================

-- "Virar ação" cria a tarefa e esta ligação. Ao concluir a tarefa, o Hub pergunta
-- se quer marcar como paga. Apagar a tarefa (ou o que ela paga) apaga a ligação.
create table if not exists public.money_tasks (
  task_id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bill_id uuid,
  card_id uuid,
  entry_id uuid,
  -- Mês da conta fixa ou da fatura (dia 1).
  month date check (month is null or extract(day from month) = 1),
  created_at timestamptz not null default now(),
  constraint money_tasks_task_fk foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  constraint money_tasks_bill_fk foreign key (bill_id, user_id) references public.money_bills (id, user_id) on delete cascade,
  constraint money_tasks_card_fk foreign key (card_id, user_id) references public.money_cards (id, user_id) on delete cascade,
  constraint money_tasks_entry_fk foreign key (entry_id, user_id) references public.money_entries (id, user_id) on delete cascade,
  check (num_nonnulls(bill_id, card_id, entry_id) = 1),
  check ((entry_id is null) = (month is not null))
);

create index if not exists money_tasks_user_id_idx on public.money_tasks (user_id);
create index if not exists money_tasks_bill_id_idx on public.money_tasks (bill_id);
create index if not exists money_tasks_card_id_idx on public.money_tasks (card_id);
create index if not exists money_tasks_entry_id_idx on public.money_tasks (entry_id);

alter table public.money_tasks enable row level security;
drop policy if exists "money_tasks: dono" on public.money_tasks;
create policy "money_tasks: dono" on public.money_tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- Conferir
-- ============================================================
-- select name, closing_day, due_day from public.money_cards;
-- select name, amount_cents, due_day, card_id from public.money_bills;
-- select kind, description, amount_cents, date, method, installments, planned from public.money_entries order by date desc limit 20;
