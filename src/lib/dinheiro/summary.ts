import type { MoneyBill, MoneyCard, MoneyData, MoneyEntry, MonthKey } from "@/types/money";
import { addDays, dueLabel } from "@/lib/dates";
import { billActiveIn, buildInvoice, dueDate, isInvoicePaid } from "./invoices";
import { addMonths, dayIn, monthOf, monthRange, monthStart } from "./months";

/*
 * O mês do Dinheiro. Regras (aprovadas na H5):
 * · compra no cartão conta no mês em que a fatura vence (parcela: uma por mês);
 * · conta fixa paga vira gasto do mês dela; a que falta pagar conta como "a pagar";
 * · pagamento futuro conta no mês da data dele;
 * · "Saiu" = pago + a pagar; "Sobra" = entrou − saiu.
 */

/** O mês a que uma movimentação pertence: pagamento de conta fixa vale para o mês da conta. */
export function entryMonth(entry: Pick<MoneyEntry, "date" | "billMonth">): MonthKey {
  return entry.billMonth ?? monthOf(entry.date);
}

export function billPayment(entries: MoneyEntry[], billId: string, month: MonthKey): MoneyEntry | undefined {
  return entries.find((e) => e.billId === billId && e.billMonth === month);
}

/** Conta fixa fora do cartão (a do cartão entra na fatura e não se marca como paga). */
export function payableBill(bill: MoneyBill): boolean {
  return bill.cardId === null;
}

/** Uma linha das movimentações do mês: entrada, gasto ou a fatura paga (uma linha por cartão). */
export type Movement =
  | { kind: "entry"; entry: MoneyEntry; date: string }
  | { kind: "invoice"; card: MoneyCard; month: MonthKey; totalCents: number; count: number; date: string };

export type MonthSummary = {
  month: MonthKey;
  inCents: number;
  /** Já pago (ou gasto) no mês. */
  paidCents: number;
  /** Ainda a pagar no mês: contas, faturas e pagamentos futuros. */
  dueCents: number;
  outCents: number;
  leftCents: number;
  incomeCount: number;
  freelaCount: number;
  movements: Movement[];
};

export function monthSummary(month: MonthKey, data: MoneyData, today: string): MonthSummary {
  let inCents = 0;
  let paidCents = 0;
  let dueCents = 0;
  let incomeCount = 0;
  let freelaCount = 0;
  const movements: Movement[] = [];

  for (const entry of data.entries) {
    if (entry.kind === "IN") {
      if (monthOf(entry.date) !== month) continue;
      inCents += entry.amountCents;
      incomeCount++;
      if (entry.category === "FREELA") freelaCount++;
      movements.push({ kind: "entry", entry, date: entry.date });
      continue;
    }
    // No cartão, conta pela fatura (abaixo).
    if (entry.cardId) continue;
    if (entry.planned) {
      if (monthOf(entry.date) === month) dueCents += entry.amountCents;
      continue;
    }
    if (entryMonth(entry) !== month) continue;
    paidCents += entry.amountCents;
    movements.push({ kind: "entry", entry, date: entry.date });
  }

  for (const bill of data.bills) {
    if (!payableBill(bill) || !billActiveIn(bill, month)) continue;
    if (!billPayment(data.entries, bill.id, month)) dueCents += bill.amountCents;
  }

  for (const card of data.cards) {
    const invoice = buildInvoice(card, month, data, today);
    if (invoice.totalCents === 0) continue;
    if (invoice.status === "paid") {
      paidCents += invoice.totalCents;
      movements.push({ kind: "invoice", card, month, totalCents: invoice.totalCents, count: invoice.items.length, date: invoice.due });
    } else {
      dueCents += invoice.totalCents;
    }
  }

  movements.sort((a, b) => b.date.localeCompare(a.date) || createdOf(b).localeCompare(createdOf(a)));
  const outCents = paidCents + dueCents;
  return { month, inCents, paidCents, dueCents, outCents, leftCents: inCents - outCents, incomeCount, freelaCount, movements };
}

function createdOf(m: Movement): string {
  return m.kind === "entry" ? m.entry.createdAt : "";
}

/** Algo para pagar: conta fixa de um mês, fatura ou pagamento futuro. */
export type DueItem =
  | { kind: "bill"; key: string; bill: MoneyBill; month: MonthKey; title: string; date: string; amountCents: number; approximate: boolean }
  | { kind: "invoice"; key: string; card: MoneyCard; month: MonthKey; title: string; date: string; amountCents: number; approximate: false; count: number }
  | { kind: "planned"; key: string; entry: MoneyEntry; title: string; date: string; amountCents: number; approximate: boolean };

/** Quantos dias à frente entram em "Próximos vencimentos". */
export const DUE_DAYS = 30;

const KIND_ORDER: Record<DueItem["kind"], number> = { bill: 0, invoice: 1, planned: 2 };

/**
 * O que falta pagar, do mês passado até `days` dias à frente, por data. O que venceu no
 * mês passado e não foi marcado continua aparecendo ("Era pra …"); antes disso, some.
 */
export function dueItems(data: MoneyData, today: string, days = DUE_DAYS): DueItem[] {
  const from = monthStart(addMonths(monthOf(today), -1));
  const to = addDays(today, days);
  const months = monthRange(monthOf(from), monthOf(to));
  const inRange = (date: string) => date >= from && date <= to;
  const items: DueItem[] = [];

  for (const bill of data.bills) {
    if (!payableBill(bill)) continue;
    for (const month of months) {
      const date = dayIn(month, bill.dueDay);
      if (!inRange(date) || !billActiveIn(bill, month) || billPayment(data.entries, bill.id, month)) continue;
      items.push({
        kind: "bill",
        key: `bill-${bill.id}-${month}`,
        bill,
        month,
        title: bill.name,
        date,
        amountCents: bill.amountCents,
        approximate: bill.variable,
      });
    }
  }

  for (const card of data.cards) {
    for (const month of months) {
      const date = dueDate(card, month);
      if (!inRange(date) || isInvoicePaid(data, card.id, month)) continue;
      const invoice = buildInvoice(card, month, data, today);
      if (invoice.totalCents === 0) continue;
      items.push({
        kind: "invoice",
        key: `invoice-${card.id}-${month}`,
        card,
        month,
        title: `Fatura ${card.name}`,
        date,
        amountCents: invoice.totalCents,
        approximate: false,
        count: invoice.items.length,
      });
    }
  }

  for (const entry of data.entries) {
    if (!entry.planned || !inRange(entry.date)) continue;
    items.push({
      kind: "planned",
      key: `planned-${entry.id}`,
      entry,
      title: entry.description,
      date: entry.date,
      amountCents: entry.amountCents,
      approximate: entry.approximate,
    });
  }

  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.title.localeCompare(b.title, "pt-BR"),
  );
}

/** Pagamentos futuros ainda não pagos, por data (inclui os que passaram do dia). */
export function plannedEntries(entries: MoneyEntry[]): MoneyEntry[] {
  return entries.filter((e) => e.planned).sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description, "pt-BR"));
}

/** Contas fixas valendo agora (ou que ainda vão começar), pelo dia do vencimento. */
export function currentBills(bills: MoneyBill[], today: string): MoneyBill[] {
  const month = monthOf(today);
  return bills
    .filter((b) => b.endsOn === null || monthOf(b.endsOn) >= month)
    .sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name, "pt-BR"));
}

/** Como está a conta fixa neste mês. */
export type BillState =
  | { kind: "card" }
  | { kind: "paid"; entry: MoneyEntry }
  | { kind: "due"; date: string }
  | { kind: "inactive" };

export function billState(bill: MoneyBill, month: MonthKey, entries: MoneyEntry[]): BillState {
  if (!payableBill(bill)) return { kind: "card" };
  if (!billActiveIn(bill, month)) return { kind: "inactive" };
  const paid = billPayment(entries, bill.id, month);
  return paid ? { kind: "paid", entry: paid } : { kind: "due", date: dayIn(month, bill.dueDay) };
}

/** Quantos dias antes do vencimento algo vira "Próxima atenção" (Central). */
export const ATTENTION_DAYS = 7;

/**
 * Frase da barra lateral e do card da Central: "2 vencem hoje" · "3 para pagar" (quando
 * algo passou do dia sem ser marcado) · "Aluguel sábado" · "Nada vencendo".
 */
export function dueAttention(items: DueItem[], today: string): string {
  const now = items.filter((i) => i.date <= today);
  if (now.some((i) => i.date < today)) return `${now.length} para pagar`;
  if (now.length > 0) return now.length === 1 ? "1 vence hoje" : `${now.length} vencem hoje`;
  const next = items.find((i) => i.date <= addDays(today, ATTENTION_DAYS));
  if (!next) return "Nada vencendo";
  return `${next.title} ${dueLabel(next.date, today).toLocaleLowerCase("pt-BR")}`;
}
