"use client";

import { useTransition } from "react";
import { Check, CircleDot, Repeat, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createMoneyTask, setInvoicePaid } from "@/lib/actions/client";
import { shortDate } from "@/lib/dates";
import { categoryLabel } from "@/lib/dinheiro/format";
import type { Invoice } from "@/lib/dinheiro/invoices";
import type { LinkedTask } from "@/lib/dinheiro/keys";
import { monthName } from "@/lib/dinheiro/months";
import { cn } from "@/lib/utils";
import { actionButton, doneButton } from "./form-parts";
import { CATEGORY_ICON } from "./icons";
import { Money } from "./money";
import { useMoneySheet } from "./money-sheets";

/** Botões da fatura: marcar paga (ou desfazer) e "Virar ação". Fatura futura não tem. */
export function InvoiceActions({ invoice, linked }: { invoice: Invoice; linked: LinkedTask | null }) {
  const [pending, startTransition] = useTransition();
  if (invoice.status === "future" || invoice.totalCents === 0) return null;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      toast(message);
    });
  }

  if (invoice.status === "paid") {
    return (
      <Button
        size="touch"
        variant="secondary"
        disabled={pending}
        onClick={() => run(() => setInvoicePaid(invoice.cardId, invoice.month, false), "Voltou para não paga.")}
        className="w-full lg:w-auto"
      >
        <Undo2 aria-hidden strokeWidth={1.75} />
        Desfazer pagamento
      </Button>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      <Button
        size="touch"
        disabled={pending}
        onClick={() => run(() => setInvoicePaid(invoice.cardId, invoice.month, true), `Fatura de ${monthName(invoice.month)} paga.`)}
        className={doneButton}
      >
        <Check aria-hidden strokeWidth={2} />
        Marcar fatura como paga
      </Button>
      {!linked && (
        <Button
          size="touch"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => createMoneyTask({ kind: "invoice", id: invoice.cardId, month: invoice.month }), "Ação criada no PULSO.")}
          className={actionButton}
        >
          <CircleDot aria-hidden strokeWidth={1.75} />
          Virar ação
        </Button>
      )}
    </div>
  );
}

/** As linhas da fatura. Compra abre a gaveta dela (a parcela abre a compra inteira); conta fixa abre a conta. */
export function InvoiceItems({ invoice }: { invoice: Invoice }) {
  const open = useMoneySheet();
  if (invoice.items.length === 0) {
    return <p className="px-3 py-4 text-sm text-foreground-secondary">Nada nesta fatura ainda.</p>;
  }
  return (
    <ul className="grid gap-0.5">
      {invoice.items.map((item) => {
        const Icon = item.source === "bill" ? Repeat : CATEGORY_ICON[item.category];
        return (
          <li key={`${item.source}-${item.id}-${item.date}`}>
            <button
              type="button"
              onClick={() =>
                item.source === "entry"
                  ? open({ type: "entry", mode: "edit", id: item.id })
                  : open({ type: "bill", mode: "edit", id: item.id, month: item.date.slice(0, 7) })
              }
              className="grid w-full grid-cols-[3.25rem_2.125rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-(--duration-fast) hover:bg-white/[0.03]"
            >
              <span className="tabular font-mono text-caption font-semibold text-foreground-subtle">{item.installment ? "parc." : shortDate(item.date)}</span>
              <span className="flex size-[2.125rem] items-center justify-center rounded-[9px] bg-[#1c1c20] text-foreground-secondary">
                <Icon aria-hidden className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{item.description}</span>
                  {item.installment && (
                    <span className="tabular shrink-0 rounded-[5px] bg-green-ink/10 px-1.5 font-mono text-[0.71875rem] font-semibold text-green-ink">
                      {item.installment.index}/{item.installment.count}
                    </span>
                  )}
                </span>
                <span className="block truncate text-caption text-foreground-subtle">
                  {item.source === "bill"
                    ? `Conta fixa · ${categoryLabel(item.category)}`
                    : item.installment
                      ? (
                          <>
                            {categoryLabel(item.category)} · compra de {shortDate(item.date)} · <Money cents={item.installment.totalCents} />
                          </>
                        )
                      : categoryLabel(item.category)}
                </span>
              </span>
              <Money cents={item.amountCents} className={cn("text-sm font-semibold")} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
