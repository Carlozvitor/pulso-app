import { z } from "zod";
import {
  INCOME_CATEGORIES,
  PAY_METHODS,
  SPEND_CATEGORIES,
  type InvoicePayment,
  type MoneyBill,
  type MoneyCard,
  type MoneyEntry,
  type MoneyTaskLink,
} from "@/types/money";

export const CARD_COLUMNS = "id, name, closing_day, due_day, credit_limit_cents, archived_at";
export const BILL_COLUMNS = "id, name, amount_cents, variable, due_day, category, card_id, starts_on, ends_on";
export const ENTRY_COLUMNS =
  "id, kind, amount_cents, description, category, date, method, card_id, installments, bill_id, bill_month, planned, approximate, created_at";
export const PAYMENT_COLUMNS = "card_id, month";
export const LINK_COLUMNS = "task_id, bill_id, card_id, entry_id, month";

export const moneyIdSchema = z.uuid();
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const cents = z.number().int().min(1, "Valor inválido.").max(2_000_000_000, "Valor inválido.");
const day = z.number().int().min(1).max(31);

// ── Entradas, gastos e pagamentos futuros ──────────────────────

/**
 * Nova movimentação (ou edição completa — a gaveta salva no botão). Normaliza o que não
 * combina: entrada não tem forma de pagamento; cartão tem cartão; pagamento futuro não tem forma.
 */
export const entryInputSchema = z
  .object({
    kind: z.enum(["IN", "OUT"]),
    amountCents: cents,
    description: z.string().trim().min(1, "Dê um nome.").max(200),
    category: z.enum([...SPEND_CATEGORIES, ...INCOME_CATEGORIES]),
    date: z.iso.date(),
    method: z.enum(PAY_METHODS).nullable(),
    cardId: z.uuid().nullable(),
    installments: z.number().int().min(1).max(24),
    planned: z.boolean(),
    approximate: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const spend = (SPEND_CATEGORIES as readonly string[]).includes(v.category);
    if (v.kind === "OUT" && !spend) ctx.addIssue({ code: "custom", message: "Escolha a categoria." });
    if (v.kind === "IN" && spend) ctx.addIssue({ code: "custom", message: "Escolha o tipo da entrada." });
    if (v.kind === "OUT" && !v.planned && v.method === "CARTAO" && !v.cardId) ctx.addIssue({ code: "custom", message: "Escolha o cartão." });
  })
  .transform((v) => {
    if (v.kind === "IN") return { ...v, method: null, cardId: null, installments: 1, planned: false, approximate: false };
    if (v.planned) return { ...v, method: null, cardId: null, installments: 1 };
    const onCard = v.method === "CARTAO";
    return { ...v, cardId: onCard ? v.cardId : null, installments: onCard ? v.installments : 1, approximate: false };
  });

export type EntryInput = z.input<typeof entryInputSchema>;

export function entryInputToRow(v: z.output<typeof entryInputSchema>) {
  return {
    kind: v.kind,
    amount_cents: v.amountCents,
    description: v.description,
    category: v.category,
    date: v.date,
    method: v.method,
    card_id: v.cardId,
    installments: v.installments,
    planned: v.planned,
    approximate: v.approximate,
  };
}

/** Marcar como paga (conta fixa ou pagamento futuro): quanto foi e quando. */
export const paySchema = z.object({ amountCents: cents, date: z.iso.date() });
export type PayInput = z.input<typeof paySchema>;

// ── Contas fixas ───────────────────────────────────────────────

export const billInputSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a conta.").max(100),
  amountCents: cents,
  variable: z.boolean(),
  dueDay: day,
  category: z.enum(SPEND_CATEGORIES),
  cardId: z.uuid().nullable(),
});

export type BillInput = z.input<typeof billInputSchema>;

export function billInputToRow(v: z.output<typeof billInputSchema>) {
  return {
    name: v.name,
    amount_cents: v.amountCents,
    variable: v.variable,
    due_day: v.dueDay,
    category: v.category,
    card_id: v.cardId,
  };
}

// ── Cartões ────────────────────────────────────────────────────

export const cardInputSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para o cartão.").max(60),
  closingDay: day,
  dueDay: day,
  limitCents: cents.nullable(),
});

export type CardInput = z.input<typeof cardInputSchema>;

export function cardInputToRow(v: z.output<typeof cardInputSchema>) {
  return { name: v.name, closing_day: v.closingDay, due_day: v.dueDay, credit_limit_cents: v.limitCents };
}

/** O que "Virar ação" liga: conta fixa de um mês, fatura de um mês ou pagamento futuro. */
export const moneyRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("bill"), id: z.uuid(), month: monthSchema }),
  z.object({ kind: z.literal("invoice"), id: z.uuid(), month: monthSchema }),
  z.object({ kind: z.literal("planned"), id: z.uuid() }),
]);

export type MoneyRef = z.input<typeof moneyRefSchema>;

// ── Linhas do banco ────────────────────────────────────────────

/** "2026-09-01" → "2026-09" */
const month = z.string().transform((v) => v.slice(0, 7));

export const cardRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    closing_day: z.number(),
    due_day: z.number(),
    credit_limit_cents: z.number().nullable(),
    archived_at: z.string().nullable(),
  })
  .transform(
    (r): MoneyCard => ({
      id: r.id,
      name: r.name,
      closingDay: r.closing_day,
      dueDay: r.due_day,
      limitCents: r.credit_limit_cents,
      archivedAt: r.archived_at,
    }),
  );

export const billRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    amount_cents: z.number(),
    variable: z.boolean(),
    due_day: z.number(),
    category: z.enum(SPEND_CATEGORIES),
    card_id: z.string().nullable(),
    starts_on: z.string(),
    ends_on: z.string().nullable(),
  })
  .transform(
    (r): MoneyBill => ({
      id: r.id,
      name: r.name,
      amountCents: r.amount_cents,
      variable: r.variable,
      dueDay: r.due_day,
      category: r.category,
      cardId: r.card_id,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
    }),
  );

export const entryRowSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["IN", "OUT"]),
    amount_cents: z.number(),
    description: z.string(),
    category: z.enum([...SPEND_CATEGORIES, ...INCOME_CATEGORIES]),
    date: z.string(),
    method: z.enum(PAY_METHODS).nullable(),
    card_id: z.string().nullable(),
    installments: z.number(),
    bill_id: z.string().nullable(),
    bill_month: month.nullable(),
    planned: z.boolean(),
    approximate: z.boolean(),
    created_at: z.string(),
  })
  .transform(
    (r): MoneyEntry => ({
      id: r.id,
      kind: r.kind,
      amountCents: r.amount_cents,
      description: r.description,
      category: r.category,
      date: r.date,
      method: r.method,
      cardId: r.card_id,
      installments: r.installments,
      billId: r.bill_id,
      billMonth: r.bill_month,
      planned: r.planned,
      approximate: r.approximate,
      createdAt: r.created_at,
    }),
  );

export const paymentRowSchema = z
  .object({ card_id: z.string(), month })
  .transform((r): InvoicePayment => ({ cardId: r.card_id, month: r.month }));

export const linkRowSchema = z
  .object({
    task_id: z.string(),
    bill_id: z.string().nullable(),
    card_id: z.string().nullable(),
    entry_id: z.string().nullable(),
    month: month.nullable(),
  })
  .transform((r): MoneyTaskLink => {
    if (r.bill_id) return { taskId: r.task_id, kind: "bill", billId: r.bill_id, month: r.month ?? "" };
    if (r.card_id) return { taskId: r.task_id, kind: "invoice", cardId: r.card_id, month: r.month ?? "" };
    return { taskId: r.task_id, kind: "planned", entryId: r.entry_id ?? "" };
  });
