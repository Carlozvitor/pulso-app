import type { MoneyBill, MoneyCard, MoneyData, MoneyEntry, MonthKey, SpendCategory } from "@/types/money";
import { splitInstallments } from "./format";
import { addMonths, dayIn, monthOf, monthRange, monthsBetween } from "./months";

/*
 * Faturas. Fatura "de outubro" = a que vence em outubro. Ela fecha no dia do fechamento:
 * no mesmo mês quando o fechamento vem antes do vencimento (fecha 23, vence 30), no mês
 * anterior quando não (fecha 28, vence 5). Compra feita no dia do fechamento já vai para
 * a próxima. Nada disso fica no banco: a fatura é somada na hora.
 */

type CardDays = Pick<MoneyCard, "closingDay" | "dueDay">;

export function dueDate(card: CardDays, month: MonthKey): string {
  return dayIn(month, card.dueDay);
}

export function closingDate(card: CardDays, month: MonthKey): string {
  return dayIn(card.closingDay < card.dueDay ? month : addMonths(month, -1), card.closingDay);
}

/** Em qual fatura cai uma compra feita em `date`. */
export function invoiceMonthFor(card: CardDays, date: string): MonthKey {
  let month = monthOf(date);
  // Ajusta até a data ficar entre o fechamento anterior (inclusive) e o desta (exclusive).
  for (let i = 0; i < 3 && date >= closingDate(card, month); i++) month = addMonths(month, 1);
  for (let i = 0; i < 3 && date < closingDate(card, addMonths(month, -1)); i++) month = addMonths(month, -1);
  return month;
}

/** A conta fixa vale neste mês (começou e não acabou). */
export function billActiveIn(bill: Pick<MoneyBill, "startsOn" | "endsOn">, month: MonthKey): boolean {
  return monthOf(bill.startsOn) <= month && (bill.endsOn === null || month <= monthOf(bill.endsOn));
}

/** Uma linha da fatura: compra (inteira ou uma parcela) ou conta fixa no cartão. */
export type InvoiceItem = {
  /** Compra: id da movimentação; conta: id da conta. */
  id: string;
  source: "entry" | "bill";
  description: string;
  category: SpendCategory;
  /** Data da compra (parcela: a da compra original); conta: o dia da cobrança. */
  date: string;
  amountCents: number;
  /** Parcela n de N (só parcelado). */
  installment: { index: number; count: number; totalCents: number } | null;
};

export type InvoiceStatus = "paid" | "closed" | "open" | "future";

export type Invoice = {
  cardId: string;
  month: MonthKey;
  closing: string;
  due: string;
  items: InvoiceItem[];
  totalCents: number;
  status: InvoiceStatus;
};

const byDateDesc = (a: InvoiceItem, b: InvoiceItem) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description, "pt-BR");

/** Compras (e parcelas) e contas fixas que caem na fatura `month` do cartão. */
export function invoiceItems(card: MoneyCard, month: MonthKey, entries: MoneyEntry[], bills: MoneyBill[]): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  for (const entry of entries) {
    if (entry.cardId !== card.id || entry.kind !== "OUT") continue;
    const index = monthsBetween(invoiceMonthFor(card, entry.date), month) + 1;
    if (index < 1 || index > entry.installments) continue;
    const parts = splitInstallments(entry.amountCents, entry.installments);
    items.push({
      id: entry.id,
      source: "entry",
      description: entry.description,
      category: entry.category as SpendCategory,
      date: entry.date,
      amountCents: parts[index - 1],
      installment: entry.installments > 1 ? { index, count: entry.installments, totalCents: entry.amountCents } : null,
    });
  }
  for (const bill of bills) {
    if (bill.cardId !== card.id) continue;
    // A cobrança do mês m cai na fatura m ou em uma das duas seguintes.
    for (const m of monthRange(addMonths(month, -2), month)) {
      if (!billActiveIn(bill, m)) continue;
      const charged = dayIn(m, bill.dueDay);
      if (invoiceMonthFor(card, charged) !== month) continue;
      items.push({
        id: bill.id,
        source: "bill",
        description: bill.name,
        category: bill.category,
        date: charged,
        amountCents: bill.amountCents,
        installment: null,
      });
    }
  }
  return items.sort(byDateDesc);
}

export function invoiceStatus(card: CardDays, month: MonthKey, paid: boolean, today: string): InvoiceStatus {
  if (paid) return "paid";
  if (today >= closingDate(card, month)) return "closed";
  if (today >= closingDate(card, addMonths(month, -1))) return "open";
  return "future";
}

export function isInvoicePaid(data: Pick<MoneyData, "payments">, cardId: string, month: MonthKey): boolean {
  return data.payments.some((p) => p.cardId === cardId && p.month === month);
}

export function buildInvoice(card: MoneyCard, month: MonthKey, data: MoneyData, today: string): Invoice {
  const items = invoiceItems(card, month, data.entries, data.bills);
  return {
    cardId: card.id,
    month,
    closing: closingDate(card, month),
    due: dueDate(card, month),
    items,
    totalCents: items.reduce((sum, item) => sum + item.amountCents, 0),
    status: invoiceStatus(card, month, isInvoicePaid(data, card.id, month), today),
  };
}

/** A fatura aberta hoje (onde entra uma compra feita agora). */
export function openInvoiceMonth(card: CardDays, today: string): MonthKey {
  return invoiceMonthFor(card, today);
}

/** Até onde vão as parcelas lançadas neste cartão (a última fatura com alguma). */
export function lastInstallmentMonth(card: MoneyCard, entries: MoneyEntry[]): MonthKey | null {
  let last: MonthKey | null = null;
  for (const entry of entries) {
    if (entry.cardId !== card.id || entry.installments < 2) continue;
    const end = addMonths(invoiceMonthFor(card, entry.date), entry.installments - 1);
    if (!last || end > last) last = end;
  }
  return last;
}

/**
 * Quanto do limite está em uso: tudo que ainda não foi pago — a fatura fechada,
 * a aberta e as parcelas que ainda vêm. Contas fixas futuras não contam (ainda não foram cobradas).
 */
export function cardInUse(card: MoneyCard, data: MoneyData, today: string): number {
  const open = openInvoiceMonth(card, today);
  const last = lastInstallmentMonth(card, data.entries);
  const until = last && last > open ? last : open;
  let total = 0;
  for (const month of monthRange(addMonths(open, -2), until)) {
    if (isInvoicePaid(data, card.id, month)) continue;
    const items = invoiceItems(card, month, data.entries, month > open ? [] : data.bills);
    total += items.reduce((sum, item) => sum + item.amountCents, 0);
  }
  return total;
}

/**
 * As faturas que aparecem nas abas da página do cartão: duas antes da aberta, a aberta
 * e as seguintes que já têm parcela (até 6 à frente). A escolhida entra se estiver fora.
 */
export function invoiceTabs(card: MoneyCard, data: MoneyData, today: string, selected?: MonthKey): MonthKey[] {
  const open = openInvoiceMonth(card, today);
  const last = lastInstallmentMonth(card, data.entries);
  const until = last && last > open ? (last < addMonths(open, 6) ? last : addMonths(open, 6)) : open;
  const tabs = monthRange(addMonths(open, -2), until);
  if (selected && !tabs.includes(selected)) tabs.push(selected);
  return tabs.sort();
}

/** Uma compra parcelada que ainda tem parcela por vir (a da próxima fatura a vencer em diante). */
export type ActiveInstallment = {
  entry: MoneyEntry;
  card: MoneyCard;
  /** A parcela da próxima fatura que vence. */
  current: number;
  perMonthCents: number;
  /** Mês da fatura da última parcela. */
  lastMonth: MonthKey;
};

export function activeInstallments(data: MoneyData, today: string): ActiveInstallment[] {
  const out: ActiveInstallment[] = [];
  for (const entry of data.entries) {
    if (entry.installments < 2 || !entry.cardId) continue;
    const card = data.cards.find((c) => c.id === entry.cardId);
    if (!card) continue;
    const first = invoiceMonthFor(card, entry.date);
    const lastMonth = addMonths(first, entry.installments - 1);
    // A primeira fatura que ainda não venceu (ou vence hoje).
    let current = 1;
    while (current <= entry.installments && dueDate(card, addMonths(first, current - 1)) < today) current++;
    if (current > entry.installments) continue;
    const parts = splitInstallments(entry.amountCents, entry.installments);
    out.push({ entry, card, current, perMonthCents: parts[parts.length - 1], lastMonth });
  }
  return out.sort((a, b) => a.lastMonth.localeCompare(b.lastMonth) || a.entry.description.localeCompare(b.entry.description, "pt-BR"));
}
