import type { requireUser } from "@/lib/supabase/server";
import { dueDate } from "./invoices";
import { dayIn, monthStart } from "./months";
import type { moneyRefSchema } from "./schemas";
import type { z } from "zod";

/*
 * Ação do PULSO ligada a uma conta fixa, fatura ou pagamento futuro (tabela money_tasks).
 * Só roda no servidor (as ações de lib/dinheiro e de lib/tasks usam).
 */

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];
type Ref = z.output<typeof moneyRefSchema>;

/** O que a ação vai pagar: o título da tarefa, o prazo (vencimento) e o nome curto. */
export async function moneyRefTarget(supabase: Supabase, ref: Ref): Promise<{ taskTitle: string; due: string; name: string } | null> {
  if (ref.kind === "bill") {
    const { data } = await supabase.from("money_bills").select("name, due_day").eq("id", ref.id).maybeSingle();
    return data ? { taskTitle: `Pagar ${data.name}`, due: dayIn(ref.month, data.due_day), name: data.name } : null;
  }
  if (ref.kind === "invoice") {
    const { data } = await supabase.from("money_cards").select("name, closing_day, due_day").eq("id", ref.id).maybeSingle();
    if (!data) return null;
    return {
      taskTitle: `Pagar fatura do ${data.name}`,
      due: dueDate({ closingDay: data.closing_day, dueDay: data.due_day }, ref.month),
      name: `fatura do ${data.name}`,
    };
  }
  const { data } = await supabase.from("money_entries").select("description, date").eq("id", ref.id).eq("planned", true).maybeSingle();
  return data ? { taskTitle: `Pagar ${data.description}`, due: data.date, name: data.description } : null;
}

type LinkRow = { bill_id: string | null; card_id: string | null; entry_id: string | null; month: string | null };

async function linkOf(supabase: Supabase, taskId: string): Promise<LinkRow | null> {
  const { data } = await supabase.from("money_tasks").select("bill_id, card_id, entry_id, month").eq("task_id", taskId).maybeSingle();
  return data;
}

/**
 * Depois de concluir a tarefa: se ela paga algo que ainda não está pago, a pergunta
 * para o toast ("Marcar “Academia” como paga?"). Sem ligação ou já pago, null.
 */
export async function payPromptFor(supabase: Supabase, taskId: string): Promise<string | null> {
  const link = await linkOf(supabase, taskId);
  if (!link) return null;

  if (link.bill_id && link.month) {
    const [bill, paid] = await Promise.all([
      supabase.from("money_bills").select("name").eq("id", link.bill_id).maybeSingle(),
      supabase.from("money_entries").select("id", { count: "exact", head: true }).eq("bill_id", link.bill_id).eq("bill_month", link.month),
    ]);
    if (!bill.data || (paid.count ?? 0) > 0) return null;
    return `Marcar “${bill.data.name}” como paga?`;
  }
  if (link.card_id && link.month) {
    const [card, paid] = await Promise.all([
      supabase.from("money_cards").select("name").eq("id", link.card_id).maybeSingle(),
      supabase.from("money_invoice_payments").select("id", { count: "exact", head: true }).eq("card_id", link.card_id).eq("month", link.month),
    ]);
    if (!card.data || (paid.count ?? 0) > 0) return null;
    return `Marcar a fatura do ${card.data.name} como paga?`;
  }
  if (link.entry_id) {
    const { data } = await supabase.from("money_entries").select("description, planned").eq("id", link.entry_id).maybeSingle();
    if (!data?.planned) return null;
    return `Marcar “${data.description}” como paga?`;
  }
  return null;
}

/**
 * "Marcar paga" a partir da tarefa: conta fixa vira gasto com o valor previsto (dá para
 * ajustar no Dinheiro); fatura fica paga; pagamento futuro vira gasto de hoje.
 */
export async function markLinkPaid(supabase: Supabase, taskId: string, today: string): Promise<boolean> {
  const link = await linkOf(supabase, taskId);
  if (!link) return false;

  if (link.bill_id && link.month) {
    const { data: bill } = await supabase.from("money_bills").select("name, category, amount_cents").eq("id", link.bill_id).maybeSingle();
    if (!bill) return false;
    const { error } = await supabase.from("money_entries").insert({
      kind: "OUT",
      amount_cents: bill.amount_cents,
      description: bill.name,
      category: bill.category,
      date: today,
      bill_id: link.bill_id,
      bill_month: monthStart(link.month.slice(0, 7)),
    });
    return !error || error.code === "23505";
  }
  if (link.card_id && link.month) {
    const { error } = await supabase.from("money_invoice_payments").insert({ card_id: link.card_id, month: link.month });
    return !error || error.code === "23505";
  }
  if (link.entry_id) {
    const { error } = await supabase.from("money_entries").update({ planned: false, approximate: false, date: today }).eq("id", link.entry_id).eq("planned", true);
    return !error;
  }
  return false;
}
