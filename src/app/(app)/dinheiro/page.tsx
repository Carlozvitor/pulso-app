import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, PiggyBank, Plus, Wallet } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { CardSummaryTile } from "@/components/dinheiro/card-tile";
import { BillList, DueList, InstallmentList, Movements, PlannedList } from "@/components/dinheiro/dinheiro-lists";
import { Money } from "@/components/dinheiro/money";
import { MoneySheetProvider, SheetButton, type SheetTarget } from "@/components/dinheiro/money-sheets";
import { EyeToggle } from "@/components/dinheiro/privacy";
import { Page } from "@/components/layout/page";
import { MONEY_ICON_CLASS } from "@/components/origins/styles";
import { addMonths, isMonthKey, monthName, monthOf, monthTitle } from "@/lib/dinheiro/months";
import { getDinheiroPage, isMissingTable, type CardSummary } from "@/lib/dinheiro/pages";
import type { DueItem } from "@/lib/dinheiro/summary";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dinheiro" };

const headerButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-sm font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22] lg:h-10 lg:px-3.5";
const linkClass = "text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground";

/** Quantos meses à frente dá para olhar (pagamentos futuros, parcelas). */
const MONTHS_AHEAD = 12;

function incomeLabel(count: number, freelas: number, salary: boolean): string {
  if (count === 0) return "nada ainda";
  const parts: string[] = [];
  if (salary) parts.push("salário");
  if (freelas > 0) parts.push(freelas === 1 ? "1 freela" : `${freelas} freelas`);
  const other = count - freelas - (salary ? 1 : 0);
  if (other > 0) parts.push(other === 1 ? "1 outra" : `${other} outras`);
  return parts.join(" e ");
}

/** Módulo Dinheiro: o mês (entrou, saiu, sobra), o que vence, cartões, contas fixas, parcelas e pagamentos futuros. */
export default async function DinheiroPage({ searchParams }: PageProps<"/dinheiro">) {
  const { mes, conta, lancamento, "mes-conta": billMonth } = await searchParams;
  let page;
  try {
    page = await getDinheiroPage(typeof mes === "string" ? mes : null);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return (
      <Page icon={Wallet} iconClassName={MONEY_ICON_CLASS} title="Dinheiro">
        <p className="panel px-4 py-5 text-sm text-foreground-secondary">
          O Dinheiro ainda não está no banco. Rode a migration <span className="font-mono text-foreground">20261003120000_dinheiro.sql</span> no SQL Editor
          do Supabase e atualize esta página.
        </p>
      </Page>
    );
  }
  const { month, today, summary, dues, cards, bills, installments, planned, activeCards, allCards, linked, billHistory, entries } = page;
  const thisMonth = monthOf(today);
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const hrefFor = (m: string) => (m === thisMonth ? "/dinheiro" : `/dinheiro?mes=${m}`);
  const salary = summary.movements.some((m) => m.kind === "entry" && m.entry.category === "SALARIO");

  // Chegou por um link (Central, tarefa): abre a gaveta certa.
  const initial: SheetTarget | null =
    typeof conta === "string" && bills.some((b) => b.bill.id === conta)
      ? { type: "bill", mode: "edit", id: conta, month: typeof billMonth === "string" && isMonthKey(billMonth) ? billMonth : thisMonth }
      : typeof lancamento === "string" && entries.some((e) => e.id === lancamento)
        ? { type: "entry", mode: "edit", id: lancamento }
        : null;

  return (
    <MoneySheetProvider
      cards={allCards}
      activeCards={activeCards}
      bills={bills.map((b) => b.bill)}
      entries={entries}
      billHistory={billHistory}
      linked={linked}
      today={today}
      initial={initial}
    >
      <Page
        wide
        icon={Wallet}
        iconClassName={MONEY_ICON_CLASS}
        title="Dinheiro"
        description="O contexto financeiro. Pagar vira ação no PULSO quando você decidir."
        actions={
          <>
            <nav aria-label="Mês" className="inline-flex h-9 items-center rounded-lg border border-border-strong bg-elevated px-0.5 lg:h-10">
              <Link href={hrefFor(prev)} aria-label={`Mês anterior (${monthName(prev)})`} className="flex size-8 items-center justify-center rounded-md text-foreground-secondary hover:text-foreground">
                <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
              <span className="px-1.5 text-sm font-medium">{monthTitle(month)}</span>
              {next <= addMonths(thisMonth, MONTHS_AHEAD) ? (
                <Link href={hrefFor(next)} aria-label={`Próximo mês (${monthName(next)})`} className="flex size-8 items-center justify-center rounded-md text-foreground-secondary hover:text-foreground">
                  <ChevronRight aria-hidden className="size-4" strokeWidth={1.75} />
                </Link>
              ) : (
                <span className="size-8" />
              )}
            </nav>
            <EyeToggle />
            <SheetButton target={{ type: "entry", mode: "new", kind: "IN" }} className={headerButton}>
              <ArrowDownLeft aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
              Nova entrada
            </SheetButton>
            <SheetButton target={{ type: "entry", mode: "new", kind: "OUT" }} className={cn(headerButton, "border-green-line bg-green-tile text-[#dcfce7] hover:bg-[#1a6338]")}>
              <Plus aria-hidden className="size-4 text-green-ink" strokeWidth={1.75} />
              Novo gasto
            </SheetButton>
          </>
        }
      >
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-5">
          <div className="grid gap-7 lg:gap-8">
            <section aria-labelledby="dinheiro-resumo">
              <SectionHeading
                id="dinheiro-resumo"
                title={`Resumo de ${monthName(month)}`}
                action={
                  month !== thisMonth ? (
                    <Link href="/dinheiro" className={linkClass}>
                      Voltar para {monthName(thisMonth)}
                    </Link>
                  ) : undefined
                }
              />
              <div className="tint tint-green grid grid-cols-2 gap-y-4 p-4 sm:grid-cols-3 lg:px-6 lg:py-5">
                <div className="col-span-2 sm:order-3 sm:col-span-1 sm:border-l sm:border-white/10 sm:pl-5">
                  <p className="flex items-center gap-1.5 text-caption font-semibold tracking-[0.08em] text-white/55 uppercase">
                    <PiggyBank aria-hidden className="size-3.5" strokeWidth={1.75} />
                    Sobra
                  </p>
                  <Money cents={Math.abs(summary.leftCents)} sign={summary.leftCents < 0 ? "−" : undefined} className="mt-1 block text-[1.75rem] leading-tight font-semibold tracking-tight text-green-ink lg:text-[1.75rem]" />
                  <p className="text-caption text-white/55">
                    {summary.leftCents < 0 ? "saiu mais do que entrou" : summary.dueCents > 0 ? "se pagar o que falta" : "no mês"}
                  </p>
                </div>
                <div className="border-t border-white/10 pt-4 sm:order-1 sm:border-t-0 sm:pt-0">
                  <p className="flex items-center gap-1.5 text-caption font-semibold tracking-[0.08em] text-white/55 uppercase">
                    <ArrowDownLeft aria-hidden className="size-3.5" strokeWidth={1.75} />
                    Entrou
                  </p>
                  <Money cents={summary.inCents} className="mt-1 block text-[1.125rem] font-semibold tracking-tight sm:text-[1.75rem] sm:leading-tight" />
                  <p className="text-caption text-white/55">{incomeLabel(summary.incomeCount, summary.freelaCount, salary)}</p>
                </div>
                <div className="border-t border-l border-white/10 pt-4 pl-4 sm:order-2 sm:border-t-0 sm:pt-0 sm:pl-5">
                  <p className="flex items-center gap-1.5 text-caption font-semibold tracking-[0.08em] text-white/55 uppercase">
                    <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={1.75} />
                    Saiu
                  </p>
                  <Money cents={summary.outCents} className="mt-1 block text-[1.125rem] font-semibold tracking-tight sm:text-[1.75rem] sm:leading-tight" />
                  <p className="text-caption text-white/55">
                    {summary.dueCents > 0 ? (
                      <>
                        inclui <Money cents={summary.dueCents} className="text-white/85" /> a pagar
                      </>
                    ) : summary.outCents > 0 ? (
                      "tudo pago"
                    ) : (
                      "nada ainda"
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* No celular, o que vence e os cartões vêm logo depois do resumo. */}
            <div className="grid gap-7 lg:hidden">
              <DuesSection id="dinheiro-vencimentos-celular" dues={dues} today={today} />
              <CardsSection id="dinheiro-cartoes-celular" cards={cards} today={today} />
            </div>

            <section aria-labelledby="dinheiro-movimentacoes">
              <SectionHeading id="dinheiro-movimentacoes" title="Movimentações" />
              <div className="tint tint-neutral p-2 lg:p-2.5">
                <Movements moves={summary.movements} month={month} />
              </div>
            </section>
          </div>

          <div className="hidden gap-8 lg:grid">
            <DuesSection id="dinheiro-vencimentos" dues={dues} today={today} />
            <CardsSection id="dinheiro-cartoes" cards={cards} today={today} />
          </div>
        </div>

        <div className="mt-8 grid items-start gap-7 lg:mt-9 lg:grid-cols-3 lg:gap-5">
          <section aria-labelledby="dinheiro-contas">
            <SectionHeading
              id="dinheiro-contas"
              title="Contas fixas"
              action={<span className="text-caption text-foreground-subtle">{bills.length === 1 ? "1 conta" : `${bills.length} contas`}</span>}
            />
            <div className="tint tint-neutral p-2">
              <BillList rows={bills} cards={activeCards} month={month} />
            </div>
          </section>

          <section aria-labelledby="dinheiro-parcelas">
            <SectionHeading
              id="dinheiro-parcelas"
              title="Parcelas"
              action={<span className="text-caption text-foreground-subtle">{installments.length === 1 ? "1 ativa" : `${installments.length} ativas`}</span>}
            />
            <div className="tint tint-neutral p-2">
              <InstallmentList items={installments} />
            </div>
          </section>

          <section aria-labelledby="dinheiro-futuros">
            <SectionHeading id="dinheiro-futuros" title="Pagamentos futuros" action={<span className="text-caption text-foreground-subtle">avulsos</span>} />
            <div className="tint tint-neutral p-2">
              <PlannedList entries={planned} today={today} />
            </div>
          </section>
        </div>
      </Page>
    </MoneySheetProvider>
  );
}

function DuesSection({ id, dues, today }: { id: string; dues: DueItem[]; today: string }) {
  return (
    <section aria-labelledby={id}>
      <SectionHeading id={id} title="Próximos vencimentos" action={<span className="text-caption text-foreground-subtle">30 dias</span>} />
      <div className="tint tint-green p-2 lg:p-2.5">
        <DueList items={dues} today={today} />
      </div>
    </section>
  );
}

function CardsSection({ id, cards, today }: { id: string; cards: CardSummary[]; today: string }) {
  return (
    <section aria-labelledby={id}>
      <SectionHeading
        id={id}
        title="Cartões"
        action={
          <SheetButton target={{ type: "card", mode: "new" }} className={linkClass}>
            + Novo cartão
          </SheetButton>
        }
      />
      {cards.length > 0 ? (
        <div className="grid gap-3">
          {cards.map((summary) => (
            <CardSummaryTile key={summary.card.id} summary={summary} today={today} />
          ))}
        </div>
      ) : (
        <p className="panel px-4 py-4 text-sm text-foreground-secondary">Nenhum cartão ainda. Com o fechamento e o vencimento, a fatura se soma sozinha.</p>
      )}
    </section>
  );
}
