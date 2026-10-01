import { unstable_rethrow } from "next/navigation";
import type { MoneyBill, MoneyCard, MoneyData, MoneyEntry, MonthKey, SpendCategory } from "@/types/money";
import { todayIn } from "@/lib/dates";
import { listOpenTasks } from "@/lib/tasks/queries";
import {
  activeInstallments,
  buildInvoice,
  cardInUse,
  invoiceTabs,
  openInvoiceMonth,
  type ActiveInstallment,
  type Invoice,
} from "./invoices";
import { addMonths, isMonthKey, monthOf } from "./months";
import { billKey, invoiceKey, plannedKey, type LinkedTask } from "./keys";
import { listMoneyData } from "./queries";
import {
  billState,
  currentBills,
  dueAttention,
  dueItems,
  monthSummary,
  plannedEntries,
  type BillState,
  type DueItem,
  type MonthSummary,
} from "./summary";

async function linkedTasks(data: MoneyData): Promise<Record<string, LinkedTask>> {
  if (data.links.length === 0) return {};
  const open = new Map((await listOpenTasks()).map((t) => [t.id, t]));
  const out: Record<string, LinkedTask> = {};
  for (const link of data.links) {
    const task = open.get(link.taskId);
    if (!task) continue;
    const key =
      link.kind === "bill" ? billKey(link.billId, link.month) : link.kind === "invoice" ? invoiceKey(link.cardId, link.month) : plannedKey(link.entryId);
    out[key] = { taskId: task.id, title: task.title, dueDate: task.dueDate };
  }
  return out;
}

/** Um cartão na tela do Dinheiro: a fatura que pede atenção (fechada e não paga) e a aberta. */
export type CardSummary = {
  card: MoneyCard;
  /** Fechada sem pagar; se não houver, a última (paga). */
  last: Invoice;
  open: Invoice;
  inUseCents: number;
};

function summarizeCard(card: MoneyCard, data: MoneyData, today: string): CardSummary {
  const openMonth = openInvoiceMonth(card, today);
  const previous = [addMonths(openMonth, -2), addMonths(openMonth, -1)].map((m) => buildInvoice(card, m, data, today));
  const pending = previous.find((i) => i.status === "closed" && i.totalCents > 0);
  return {
    card,
    last: pending ?? previous[1],
    open: buildInvoice(card, openMonth, data, today),
    inUseCents: cardInUse(card, data, today),
  };
}

/** Conta fixa na lista, com a situação no mês que se está vendo. */
export type BillRow = { bill: MoneyBill; state: BillState };

export type DinheiroPage = {
  month: MonthKey;
  today: string;
  current: boolean;
  summary: MonthSummary;
  dues: DueItem[];
  cards: CardSummary[];
  bills: BillRow[];
  installments: ActiveInstallment[];
  planned: MoneyEntry[];
  /** Cartões que dá para escolher (sem os guardados). */
  activeCards: MoneyCard[];
  allCards: MoneyCard[];
  linked: Record<string, LinkedTask>;
  /** Últimos pagamentos de cada conta fixa (para a gaveta). */
  billHistory: Record<string, MoneyEntry[]>;
  entries: MoneyEntry[];
};

/** Supabase: a tabela não existe (migration do Dinheiro ainda não aplicada). */
export function isMissingTable(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error.code === "PGRST205" || error.code === "42P01");
}

/** Tela do Dinheiro no mês `month` (padrão: o mês de hoje). */
export async function getDinheiroPage(month?: string | null): Promise<DinheiroPage> {
  const today = todayIn();
  const viewed = isMonthKey(month) ? month : monthOf(today);
  const data = await listMoneyData(viewed < monthOf(today) ? viewed : undefined);
  const activeCards = data.cards.filter((c) => !c.archivedAt);

  const billHistory: Record<string, MoneyEntry[]> = {};
  for (const entry of data.entries) {
    if (!entry.billId) continue;
    (billHistory[entry.billId] ??= []).push(entry);
  }
  for (const list of Object.values(billHistory)) list.sort((a, b) => (b.billMonth ?? "").localeCompare(a.billMonth ?? ""));

  return {
    month: viewed,
    today,
    current: viewed === monthOf(today),
    summary: monthSummary(viewed, data, today),
    dues: dueItems(data, today),
    cards: activeCards.map((card) => summarizeCard(card, data, today)),
    bills: currentBills(data.bills, today).map((bill) => ({ bill, state: billState(bill, viewed, data.entries) })),
    installments: activeInstallments(data, today),
    planned: plannedEntries(data.entries),
    activeCards,
    allCards: data.cards,
    linked: await linkedTasks(data),
    billHistory,
    entries: data.entries,
  };
}

export type CardPage = {
  card: MoneyCard;
  today: string;
  invoice: Invoice;
  tabs: { month: MonthKey; status: Invoice["status"]; totalCents: number }[];
  categories: { category: SpendCategory; cents: number }[];
  inUseCents: number;
  linked: LinkedTask | null;
  activeCards: MoneyCard[];
  allCards: MoneyCard[];
  bills: MoneyBill[];
  entries: MoneyEntry[];
};

/** Página de um cartão, com a fatura `month` (padrão: a fechada sem pagar, senão a aberta). */
export async function getCardPage(id: string, month?: string | null): Promise<CardPage | null> {
  const today = todayIn();
  const data = await listMoneyData(isMonthKey(month) && month < monthOf(today) ? month : undefined);
  const card = data.cards.find((c) => c.id === id);
  if (!card) return null;

  const summary = summarizeCard(card, data, today);
  const selected = isMonthKey(month) ? month : summary.last.status === "closed" ? summary.last.month : summary.open.month;
  const invoice = buildInvoice(card, selected, data, today);

  const byCategory = new Map<SpendCategory, number>();
  for (const item of invoice.items) byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amountCents);

  return {
    card,
    today,
    invoice,
    tabs: invoiceTabs(card, data, today, selected).map((m) => {
      const i = m === selected ? invoice : buildInvoice(card, m, data, today);
      return { month: m, status: i.status, totalCents: i.totalCents };
    }),
    categories: [...byCategory].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents),
    inUseCents: summary.inUseCents,
    linked: (await linkedTasks(data))[invoiceKey(card.id, selected)] ?? null,
    activeCards: data.cards.filter((c) => !c.archivedAt),
    allCards: data.cards,
    bills: data.bills,
    entries: data.entries,
  };
}

/**
 * Sem as tabelas do Dinheiro (migration ainda não aplicada), barra lateral e Central seguem
 * sem ele em vez de cair.
 */
async function safely<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    // Redirecionamento (sessão expirada) e avisos internos do Next seguem adiante.
    unstable_rethrow(error);
    console.warn("Dinheiro indisponível (a migration 20261003120000_dinheiro.sql foi aplicada?)", error);
    return null;
  }
}

/** Barra lateral: os cartões e a frase do que vence. */
export function getDinheiroNav(): Promise<{ cards: { id: string; name: string }[]; attention: string } | null> {
  return safely(async () => {
    const today = todayIn();
    const data = await listMoneyData();
    return {
      cards: data.cards.filter((c) => !c.archivedAt).map((c) => ({ id: c.id, name: c.name })),
      attention: dueAttention(dueItems(data, today), today),
    };
  });
}

/** Central: o que vence (para Hoje e Próximas atenções) e o card de "Minha vida". */
export function getDinheiroCentral(): Promise<{ dues: DueItem[]; leftCents: number; attention: string; month: MonthKey } | null> {
  return safely(async () => {
    const today = todayIn();
    const data = await listMoneyData();
    const dues = dueItems(data, today);
    return { dues, leftCents: monthSummary(monthOf(today), data, today).leftCents, attention: dueAttention(dues, today), month: monthOf(today) };
  });
}
