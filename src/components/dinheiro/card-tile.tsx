import Link from "next/link";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { CardTile } from "@/components/cards/card-parts";
import { dueLabel, shortDate } from "@/lib/dates";
import type { Invoice } from "@/lib/dinheiro/invoices";
import { monthName } from "@/lib/dinheiro/months";
import type { CardSummary } from "@/lib/dinheiro/pages";
import { cn } from "@/lib/utils";
import { Money } from "./money";

const STATUS: Record<Invoice["status"], string> = { paid: "paga", closed: "fechada", open: "aberta", future: "próxima" };

function InvoiceBox({ invoice, today }: { invoice: Invoice; today: string }) {
  const hot = invoice.status === "closed" && invoice.due <= today;
  const foot =
    invoice.status === "open"
      ? "até agora"
      : invoice.status === "paid"
        ? `venceu ${shortDate(invoice.due)}`
        : invoice.due === today
          ? "vence hoje"
          : invoice.due < today
            ? dueLabel(invoice.due, today).toLowerCase()
            : `vence ${dueLabel(invoice.due, today).toLowerCase()}`;
  return (
    <div className="min-w-0 rounded-lg bg-black/20 px-3 py-2.5">
      <span className="block truncate text-caption text-white/50">
        Fatura de {monthName(invoice.month)} · {STATUS[invoice.status]}
      </span>
      <Money cents={invoice.totalCents} className="block text-base font-semibold" />
      <span className={cn("block text-caption", hot ? "text-amber-ink" : "text-white/55")}>{foot}</span>
    </div>
  );
}

/** Cartão na tela do Dinheiro: a fatura que pede atenção, a aberta e quanto do limite está em uso. */
export function CardSummaryTile({ summary, today }: { summary: CardSummary; today: string }) {
  const { card, last, open, inUseCents } = summary;
  const percent = card.limitCents ? Math.min(100, Math.round((inUseCents / card.limitCents) * 100)) : null;
  return (
    <Link href={`/dinheiro/cartoes/${card.id}`} className="tint tint-green group flex flex-col p-4 transition-[filter] duration-(--duration-fast) hover:brightness-115 lg:px-5">
      <span className="flex items-center gap-3">
        <CardTile icon={CreditCard} className="size-10 lg:size-10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{card.name}</span>
          <span className="block text-caption text-white/55">
            Fecha dia {card.closingDay} · vence dia {card.dueDay}
          </span>
        </span>
        <ArrowUpRight aria-hidden className="size-5 text-green-ink opacity-60 transition-opacity group-hover:opacity-100" strokeWidth={1.75} />
      </span>
      <span className="mt-3 grid grid-cols-2 gap-2">
        <InvoiceBox invoice={last} today={today} />
        <InvoiceBox invoice={open} today={today} />
      </span>
      <span className="mt-2.5 flex items-center gap-2.5 text-caption text-white/55">
        <span className="shrink-0">
          Em uso <Money cents={inUseCents} />
          {card.limitCents ? (
            <>
              {" "}
              de <Money cents={card.limitCents} />
            </>
          ) : null}
        </span>
        {percent !== null && (
          <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-green-ink/75" style={{ width: `${percent}%` }} />
          </span>
        )}
      </span>
    </Link>
  );
}
