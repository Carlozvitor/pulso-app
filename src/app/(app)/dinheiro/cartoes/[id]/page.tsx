import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, Plus } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { LinkedTaskRow } from "@/components/dinheiro/form-parts";
import { InvoiceActions, InvoiceItems } from "@/components/dinheiro/invoice-view";
import { Money } from "@/components/dinheiro/money";
import { MoneySheetProvider, SheetButton } from "@/components/dinheiro/money-sheets";
import { EyeToggle } from "@/components/dinheiro/privacy";
import { Page } from "@/components/layout/page";
import { MONEY_ICON_CLASS } from "@/components/origins/styles";
import { dueLabel, pastDayTitle, shortDate } from "@/lib/dates";
import { categoryLabel } from "@/lib/dinheiro/format";
import type { Invoice } from "@/lib/dinheiro/invoices";
import { monthName } from "@/lib/dinheiro/months";
import { getCardPage } from "@/lib/dinheiro/pages";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cartão" };

const headerButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-sm font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22] lg:h-10 lg:px-3.5";

const TAB_STATUS: Record<Invoice["status"], string> = { paid: "paga", closed: "fechada", open: "aberta", future: "próxima" };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Linha de baixo do total: quando fechou/fecha e quando vence. */
function invoiceLine(invoice: Invoice, today: string): string {
  const closed = invoice.closing <= today;
  const closing = closed ? `Fechou ${pastDayTitle(invoice.closing, today).toLowerCase()}` : `Fecha ${dueLabel(invoice.closing, today).toLowerCase()}`;
  if (invoice.status === "paid") return `${closing} · paga · venceu ${shortDate(invoice.due)}`;
  const due = invoice.due === today ? "vence hoje" : invoice.due < today ? dueLabel(invoice.due, today).toLowerCase() : `vence ${dueLabel(invoice.due, today).toLowerCase()}`;
  return `${closing} · ${due}`;
}

/** Um cartão: uma aba por fatura, as compras e parcelas dela, por categoria e os dados do cartão. */
export default async function CartaoPage({ params, searchParams }: PageProps<"/dinheiro/cartoes/[id]">) {
  const { id } = await params;
  const { fatura } = await searchParams;
  const page = await getCardPage(id, typeof fatura === "string" ? fatura : null);
  if (!page) notFound();
  const { card, today, invoice, tabs, categories, inUseCents, linked, activeCards, allCards, bills, entries } = page;

  return (
    <MoneySheetProvider cards={allCards} activeCards={activeCards} bills={bills} entries={entries} linked={{}} today={today}>
      <Page
        wide
        icon={CreditCard}
        iconClassName={MONEY_ICON_CLASS}
        title={card.name}
        description={[`Fecha dia ${card.closingDay}`, `vence dia ${card.dueDay}`, card.archivedAt ? "guardado" : null].filter(Boolean).join(" · ")}
        crumbs={[{ label: "Dinheiro", href: "/dinheiro" }, { label: card.name }]}
        actions={
          <>
            <EyeToggle />
            <SheetButton target={{ type: "entry", mode: "new", kind: "OUT", cardId: card.id }} className={headerButton}>
              <Plus aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
              Compra neste cartão
            </SheetButton>
          </>
        }
      >
        <nav aria-label="Faturas" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
          {tabs.map((tab) => {
            const selected = tab.month === invoice.month;
            return (
              <Link
                key={tab.month}
                href={`/dinheiro/cartoes/${card.id}?fatura=${tab.month}`}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-(--duration-fast)",
                  selected ? "border-green-line bg-green-tile text-[#dcfce7]" : "border-border-strong bg-[#141417] text-foreground-secondary hover:text-foreground",
                )}
              >
                {capitalize(monthName(tab.month))}
                <span className={cn("text-caption font-normal", selected ? "text-[#a7d9b8]" : "text-foreground-subtle")}>
                  {tab.status === "future" && tab.totalCents > 0 ? "só parcelas" : TAB_STATUS[tab.status]}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-5">
          <section aria-labelledby="fatura-titulo" className="grid gap-4">
            <div className="tint tint-green flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-5">
              <div>
                <h2 id="fatura-titulo" className="text-caption font-semibold tracking-[0.08em] text-white/55 uppercase">
                  Fatura de {monthName(invoice.month)}
                </h2>
                <Money cents={invoice.totalCents} className="mt-1 block text-[2rem] leading-tight font-semibold tracking-tight" />
                <p className="text-sm text-white/65">{invoiceLine(invoice, today)}</p>
              </div>
              <InvoiceActions invoice={invoice} linked={linked} />
            </div>

            <div className="tint tint-neutral p-2 lg:p-2.5">
              <InvoiceItems invoice={invoice} />
              {invoice.items.length > 0 && (
                <div className="mt-1.5 flex justify-between border-t border-border px-3 pt-3 pb-1 text-sm text-foreground-subtle">
                  <span>{invoice.items.length === 1 ? "1 lançamento" : `${invoice.items.length} lançamentos`}</span>
                  <Money cents={invoice.totalCents} className="font-semibold text-foreground" />
                </div>
              )}
            </div>
          </section>

          <aside className="grid gap-5">
            {categories.length > 0 && (
              <section aria-labelledby="fatura-categorias" className="panel px-4 py-3.5">
                <SectionHeading id="fatura-categorias" title="Por categoria" />
                <ul className="divide-y divide-border">
                  {categories.map((c) => (
                    <li key={c.category} className="flex justify-between py-2 text-sm">
                      <span className="text-foreground-secondary">{categoryLabel(c.category)}</span>
                      <Money cents={c.cents} className="font-medium" />
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-caption text-foreground-subtle">Estes valores entram no “Saiu” de {monthName(invoice.month)}, mês em que a fatura vence.</p>
              </section>
            )}

            <section aria-labelledby="fatura-cartao" className="panel px-4 py-3.5">
              <SectionHeading
                id="fatura-cartao"
                title="Cartão"
                action={
                  <SheetButton target={{ type: "card", mode: "edit", id: card.id }} className="text-caption text-foreground-subtle hover:text-foreground">
                    Editar
                  </SheetButton>
                }
              />
              <dl className="divide-y divide-border text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-foreground-subtle">Fecha</dt>
                  <dd className="font-medium">dia {card.closingDay}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-foreground-subtle">Vence</dt>
                  <dd className="font-medium">dia {card.dueDay}</dd>
                </div>
                {card.limitCents && (
                  <div className="flex justify-between py-2">
                    <dt className="text-foreground-subtle">Limite</dt>
                    <dd className="font-medium">
                      <Money cents={card.limitCents} />
                    </dd>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <dt className="text-foreground-subtle">Em uso</dt>
                  <dd className="font-medium">
                    <Money cents={inUseCents} />
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-caption text-foreground-subtle">“Em uso” soma o que ainda não foi pago: a fatura fechada, a aberta e as parcelas que ainda vêm.</p>
            </section>

            {invoice.status !== "paid" && invoice.status !== "future" && invoice.totalCents > 0 && (
              <section aria-labelledby="fatura-acao" className="panel px-4 py-3.5">
                <SectionHeading id="fatura-acao" title="Ação no PULSO" />
                {linked ? (
                  <LinkedTaskRow task={linked} today={today} />
                ) : (
                  <p className="text-caption text-foreground-subtle">Se decidir pagar num dia, “Virar ação” coloca “Pagar fatura do {card.name}” no PULSO. Ao concluir, o Hub pergunta se quer marcar a fatura como paga.</p>
                )}
              </section>
            )}
          </aside>
        </div>
      </Page>
    </MoneySheetProvider>
  );
}
