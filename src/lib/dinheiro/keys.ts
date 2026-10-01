import type { MonthKey } from "@/types/money";

/*
 * Chaves que ligam uma conta de um mês, uma fatura ou um pagamento futuro à ação do PULSO
 * (iguais às dos vencimentos). TS puro: as gavetas usam no aparelho.
 */

/** Ação aberta no PULSO ligada a algo do Dinheiro. */
export type LinkedTask = { taskId: string; title: string; dueDate: string | null };

export function billKey(billId: string, month: MonthKey) {
  return `bill-${billId}-${month}`;
}
export function invoiceKey(cardId: string, month: MonthKey) {
  return `invoice-${cardId}-${month}`;
}
export function plannedKey(entryId: string) {
  return `planned-${entryId}`;
}
