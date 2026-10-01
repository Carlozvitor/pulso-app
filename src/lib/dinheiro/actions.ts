"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { addDays, todayIn } from "@/lib/dates";
import type { CreateResult } from "@/lib/projects/actions";
import type { ActionResult } from "@/lib/tasks/actions";
import { addMonths, dayIn, monthOf, monthStart } from "./months";
import { markLinkPaid, moneyRefTarget } from "./links";
import {
  billInputSchema,
  billInputToRow,
  cardInputSchema,
  cardInputToRow,
  entryInputSchema,
  entryInputToRow,
  moneyIdSchema,
  moneyRefSchema,
  monthSchema,
  paySchema,
  type BillInput,
  type CardInput,
  type EntryInput,
  type MoneyRef,
  type PayInput,
} from "./schemas";

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";

/** Postgres: chave estrangeira (cartão com compras) e unicidade (já estava marcada). */
const FOREIGN_KEY = "23503";
const UNIQUE = "23505";

type Failure = { ok: false; error: string };
const fail = (error = GENERIC_ERROR): Failure => ({ ok: false, error });

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** Pagou pelo Dinheiro: a ação ligada no PULSO (se houver e estiver aberta) conclui junto. */
async function completeLinkedTasks(supabase: Supabase, column: "bill_id" | "card_id" | "entry_id", id: string, month?: string) {
  let query = supabase.from("money_tasks").select("task_id").eq(column, id);
  if (month) query = query.eq("month", monthStart(month));
  const { data } = await query;
  const ids = (data ?? []).map((r) => r.task_id as string);
  if (ids.length === 0) return;
  await supabase.from("tasks").update({ status: "DONE" }).in("id", ids).in("status", ["INBOX", "TODO", "IN_PROGRESS"]);
}

// ── Entradas, gastos e pagamentos futuros ──────────────────────

export async function createEntry(input: EntryInput): Promise<CreateResult> {
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("money_entries").insert(entryInputToRow(parsed.data)).select("id").single();
  if (error) return fail();

  refresh();
  return { ok: true, id: data.id };
}

export async function updateEntry(id: string, input: EntryInput): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  const parsed = entryInputSchema.safeParse(input);
  if (!parsedId.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { error } = await supabase.from("money_entries").update(entryInputToRow(parsed.data)).eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Pagamento de conta fixa apagado = a conta volta para "a pagar" naquele mês. */
export async function deleteEntry(id: string): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase.from("money_entries").delete().eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Pagamento futuro pago: vira gasto com o valor e a data de verdade. */
export async function payPlanned(id: string, pay: PayInput): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  const parsed = paySchema.safeParse(pay);
  if (!parsedId.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("money_entries")
    .update({ planned: false, approximate: false, amount_cents: parsed.data.amountCents, date: parsed.data.date })
    .eq("id", parsedId.data)
    .eq("planned", true);
  if (error) return fail();
  await completeLinkedTasks(supabase, "entry_id", parsedId.data);

  refresh();
  return { ok: true };
}

// ── Contas fixas ───────────────────────────────────────────────

/**
 * Nova conta fixa. Se o dia dela já passou neste mês, começa no mês que vem (a deste mês,
 * se foi paga, já saiu do bolso — dá para lançar como gasto).
 */
export async function createBill(input: BillInput): Promise<CreateResult> {
  const parsed = billInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const today = todayIn();
  const month = monthOf(today);
  const startsOn = monthStart(dayIn(month, parsed.data.dueDay) >= today ? month : addMonths(month, 1));

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("money_bills")
    .insert({ ...billInputToRow(parsed.data), starts_on: startsOn })
    .select("id")
    .single();
  if (error) return fail();

  refresh();
  return { ok: true, id: data.id };
}

export async function updateBill(id: string, input: BillInput): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  const parsed = billInputSchema.safeParse(input);
  if (!parsedId.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { error } = await supabase.from("money_bills").update(billInputToRow(parsed.data)).eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/**
 * Encerrar: some das próximas contas. O que já foi pago continua nos gastos. Este mês ainda
 * conta se já foi pago ou se o dia já passou. Conta sem nenhum pagamento é apagada.
 */
export async function endBill(id: string): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const today = todayIn();
  const month = monthOf(today);
  const { supabase } = await requireUser();
  const [{ data: bill, error }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("money_bills").select("due_day, starts_on").eq("id", parsedId.data).maybeSingle(),
    supabase.from("money_entries").select("bill_month").eq("bill_id", parsedId.data),
  ]);
  if (error || paymentsError || !bill) return fail();

  if (payments.length === 0) {
    const { error: deleteError } = await supabase.from("money_bills").delete().eq("id", parsedId.data);
    if (deleteError) return fail();
  } else {
    const paidThisMonth = payments.some((p) => (p.bill_month as string).startsWith(month));
    const lastDay = paidThisMonth || dayIn(month, bill.due_day) < today ? today : addDays(monthStart(month), -1);
    const { error: updateError } = await supabase
      .from("money_bills")
      .update({ ends_on: lastDay < bill.starts_on ? bill.starts_on : lastDay })
      .eq("id", parsedId.data);
    if (updateError) return fail();
  }

  refresh();
  return { ok: true };
}

/** Conta fixa paga: vira um gasto do mês dela, com o valor e a data de verdade. */
export async function payBill(id: string, month: string, pay: PayInput): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  const parsedMonth = monthSchema.safeParse(month);
  const parsed = paySchema.safeParse(pay);
  if (!parsedId.success || !parsedMonth.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { data: bill, error: billError } = await supabase.from("money_bills").select("name, category").eq("id", parsedId.data).maybeSingle();
  if (billError || !bill) return fail();

  const { error } = await supabase.from("money_entries").insert({
    kind: "OUT",
    amount_cents: parsed.data.amountCents,
    description: bill.name,
    category: bill.category,
    date: parsed.data.date,
    method: null,
    bill_id: parsedId.data,
    bill_month: monthStart(parsedMonth.data),
  });
  if (error && error.code !== UNIQUE) return fail();
  await completeLinkedTasks(supabase, "bill_id", parsedId.data, parsedMonth.data);

  refresh();
  return { ok: true };
}

/** Desfaz "paga": apaga o gasto daquele mês. */
export async function unpayBill(id: string, month: string): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  const parsedMonth = monthSchema.safeParse(month);
  if (!parsedId.success || !parsedMonth.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase.from("money_entries").delete().eq("bill_id", parsedId.data).eq("bill_month", monthStart(parsedMonth.data));
  if (error) return fail();

  refresh();
  return { ok: true };
}

// ── Cartões e faturas ──────────────────────────────────────────

export async function createCard(input: CardInput): Promise<CreateResult> {
  const parsed = cardInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("money_cards").insert(cardInputToRow(parsed.data)).select("id").single();
  if (error) return fail();

  refresh();
  return { ok: true, id: data.id };
}

export async function updateCard(id: string, input: CardInput): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  const parsed = cardInputSchema.safeParse(input);
  if (!parsedId.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { error } = await supabase.from("money_cards").update(cardInputToRow(parsed.data)).eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Guardar o cartão (ou trazer de volta): some das listas; as compras continuam contando. */
export async function setCardArchived(id: string, archived: boolean): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("money_cards")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Só apaga cartão sem nenhuma compra (com compras, guarda-se). */
export async function deleteCard(id: string): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase.from("money_cards").delete().eq("id", parsedId.data);
  if (error?.code === FOREIGN_KEY) return fail("Esse cartão tem compras lançadas. Guarde o cartão em vez de apagar.");
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Fatura paga (ou desfaz). Não cria gasto: as compras já estão lançadas. */
export async function setInvoicePaid(cardId: string, month: string, paid: boolean): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(cardId);
  const parsedMonth = monthSchema.safeParse(month);
  if (!parsedId.success || !parsedMonth.success) return fail();

  const { supabase } = await requireUser();
  const { error } = paid
    ? await supabase.from("money_invoice_payments").insert({ card_id: parsedId.data, month: monthStart(parsedMonth.data) })
    : await supabase.from("money_invoice_payments").delete().eq("card_id", parsedId.data).eq("month", monthStart(parsedMonth.data));
  if (error && error.code !== UNIQUE) return fail();
  if (paid) await completeLinkedTasks(supabase, "card_id", parsedId.data, parsedMonth.data);

  refresh();
  return { ok: true };
}

// ── Ações no PULSO ─────────────────────────────────────────────

/**
 * "Virar ação": cria "Pagar …" em A fazer, com origem Dinheiro e prazo no vencimento,
 * ligada ao que ela paga. Uma ação aberta por vez para a mesma coisa.
 */
export async function createMoneyTask(ref: MoneyRef): Promise<ActionResult> {
  const parsed = moneyRefSchema.safeParse(ref);
  if (!parsed.success) return fail();
  const target = parsed.data;

  const { supabase } = await requireUser();
  const [root, found, existing] = await Promise.all([
    supabase.from("areas").select("id").eq("module", "DINHEIRO").is("parent_id", null).maybeSingle(),
    moneyRefTarget(supabase, target),
    supabase.from("money_tasks").select("task_id, tasks(status)").match(
      target.kind === "planned"
        ? { entry_id: target.id }
        : { [target.kind === "bill" ? "bill_id" : "card_id"]: target.id, month: monthStart(target.month) },
    ),
  ]);
  if (root.error || !found || existing.error) return fail();
  const open = (existing.data ?? []).some((row) => {
    const task = row.tasks as unknown as { status: string } | null;
    return task && !["DONE", "ARCHIVED"].includes(task.status);
  });
  if (open) return fail("Já tem uma ação para isso no PULSO.");

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({ title: found.taskTitle, status: "TODO", due_date: found.due, area_id: root.data?.id ?? null })
    .select("id")
    .single();
  if (error) return fail();

  const link: { task_id: string; bill_id?: string; card_id?: string; entry_id?: string; month?: string } =
    target.kind === "planned"
      ? { task_id: task.id, entry_id: target.id }
      : target.kind === "bill"
        ? { task_id: task.id, bill_id: target.id, month: monthStart(target.month) }
        : { task_id: task.id, card_id: target.id, month: monthStart(target.month) };
  const { error: linkError } = await supabase.from("money_tasks").insert(link);
  if (linkError) {
    await supabase.from("tasks").delete().eq("id", task.id);
    return fail();
  }

  refresh();
  return { ok: true };
}

/** Resposta ao "Marcar como paga?" depois de concluir a ação no PULSO. */
export async function payTaskLink(taskId: string): Promise<ActionResult> {
  const parsedId = moneyIdSchema.safeParse(taskId);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const ok = await markLinkPaid(supabase, parsedId.data, todayIn());
  if (!ok) return fail();

  refresh();
  return { ok: true };
}

