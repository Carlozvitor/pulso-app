import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import type { MoneyData } from "@/types/money";
import { addMonths, monthOf, monthStart } from "./months";
import {
  BILL_COLUMNS,
  CARD_COLUMNS,
  ENTRY_COLUMNS,
  LINK_COLUMNS,
  PAYMENT_COLUMNS,
  billRowSchema,
  cardRowSchema,
  entryRowSchema,
  linkRowSchema,
  paymentRowSchema,
} from "./schemas";

/** Parcela vai até 24 meses: com 26 de folga, toda fatura desde `from` fecha certa. */
const LOOKBACK_MONTHS = 26;

/** O banco devolve no máximo 1000 linhas por vez. */
const PAGE = 1000;

/**
 * Tudo do Dinheiro desde `fromMonth` (movimentações; cartões, contas, faturas pagas e
 * ligações vêm inteiros). Em cache por requisição: barra lateral, Central e a tela leem o mesmo.
 */
export const listMoneyData = cache(async function listMoneyData(fromMonth?: string): Promise<MoneyData> {
  const { supabase } = await requireUser();
  const since = monthStart(addMonths(fromMonth ?? monthOf(todayIn()), -LOOKBACK_MONTHS));

  const [cards, bills, payments, links] = await Promise.all([
    supabase.from("money_cards").select(CARD_COLUMNS).order("created_at"),
    supabase.from("money_bills").select(BILL_COLUMNS),
    supabase.from("money_invoice_payments").select(PAYMENT_COLUMNS),
    supabase.from("money_tasks").select(LINK_COLUMNS),
  ]);
  for (const result of [cards, bills, payments, links]) if (result.error) throw result.error;

  const entries: unknown[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("money_entries")
      .select(ENTRY_COLUMNS)
      .or(`date.gte.${since},planned.eq.true`)
      .order("date")
      .order("id")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    entries.push(...data);
    if (data.length < PAGE) break;
  }

  return {
    cards: z.array(cardRowSchema).parse(cards.data),
    bills: z.array(billRowSchema).parse(bills.data),
    entries: z.array(entryRowSchema).parse(entries),
    payments: z.array(paymentRowSchema).parse(payments.data),
    links: z.array(linkRowSchema).parse(links.data),
  };
});
