"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check, CreditCard, Plus, Repeat } from "lucide-react";
import { WEEKDAYS_SHORT, daysBetween, dueLabel, shortDate, weekday } from "@/lib/dates";
import { METHOD_LABEL, SPEND_LABEL, categoryLabel } from "@/lib/dinheiro/format";
import type { ActiveInstallment } from "@/lib/dinheiro/invoices";
import { monthName, monthShort } from "@/lib/dinheiro/months";
import type { BillState, DueItem, Movement } from "@/lib/dinheiro/summary";
import type { MoneyBill, MoneyCard, MoneyEntry, MonthKey } from "@/types/money";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON } from "./icons";
import { Money } from "./money";
import { useMoneySheet } from "./money-sheets";

const rowButton = "w-full text-left transition-colors duration-(--duration-fast)";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ── Próximos vencimentos ───────────────────────────────────────

/** Quantos aparecem antes de "Ver todos". */
const DUES_SHOWN = 7;

function dueMeta(item: DueItem): { icon: typeof Repeat; text: string } {
  if (item.kind === "bill") return { icon: Repeat, text: item.bill.variable ? "Conta fixa · valor varia" : `Conta fixa · ${SPEND_LABEL[item.bill.category]}` };
  if (item.kind === "invoice") return { icon: CreditCard, text: item.count === 1 ? "1 lançamento" : `${item.count} lançamentos` };
  return { icon: CalendarPlus, text: "Pagamento futuro" };
}

/** Uma linha: dia à esquerda, o que é, e quanto + quando à direita. Toca → abre. */
function DueRow({ item, today }: { item: DueItem; today: string }) {
  const open = useMoneySheet();
  const when = dueLabel(item.date, today);
  const hot = item.date <= today;
  const meta = dueMeta(item);
  const content = (
    <span className={cn("grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-black/20 py-2.5 pr-3 pl-1.5 hover:bg-black/35")}>
      <span className="text-center leading-tight">
        <span className={cn("block text-[0.65625rem] font-semibold tracking-[0.08em] uppercase", hot ? "text-amber-ink" : "text-white/50")}>
          {item.date === today ? "Hoje" : WEEKDAYS_SHORT[weekday(item.date)]}
        </span>
        <span className={cn("block text-[1.1875rem] font-semibold tracking-tight", hot && "text-amber-ink")}>{Number(item.date.slice(8))}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        <span className="flex items-center gap-1.5 truncate text-caption text-white/55">
          <meta.icon aria-hidden className="size-3 shrink-0" strokeWidth={1.75} />
          {meta.text}
        </span>
      </span>
      <span className="text-right">
        <Money cents={item.amountCents} approximate={item.approximate} className="block text-sm font-semibold" />
        <span className={cn("block text-caption font-medium", hot ? "text-amber-ink" : "text-white/50")}>
          {item.date === today ? "Vence hoje" : when}
        </span>
      </span>
    </span>
  );

  if (item.kind === "invoice") {
    return (
      <li>
        <Link href={`/dinheiro/cartoes/${item.card.id}?fatura=${item.month}`} className={rowButton}>
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        className={rowButton}
        onClick={() => (item.kind === "bill" ? open({ type: "bill", mode: "edit", id: item.bill.id, month: item.month }) : open({ type: "entry", mode: "edit", id: item.entry.id }))}
      >
        {content}
      </button>
    </li>
  );
}

export function DueList({ items, today }: { items: DueItem[]; today: string }) {
  const [all, setAll] = useState(false);
  if (items.length === 0) {
    return <p className="rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60">Nada para pagar nos próximos 30 dias.</p>;
  }
  const shown = all ? items : items.slice(0, DUES_SHOWN);
  const hidden = items.length - shown.length;
  const total = items.reduce((sum, i) => sum + i.amountCents, 0);
  return (
    <>
      <ul className="grid gap-0.5">
        {shown.map((item) => (
          <DueRow key={item.key} item={item} today={today} />
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 px-2 pt-2.5 text-caption text-white/55">
        {hidden > 0 ? (
          <button type="button" onClick={() => setAll(true)} className="min-h-8 hover:text-white">
            + {hidden} até {shortDate(items[items.length - 1].date)}
          </button>
        ) : (
          <span>{items.length === 1 ? "1 vencimento" : `${items.length} vencimentos`}</span>
        )}
        <span>
          <Money cents={total} /> no total
        </span>
      </div>
    </>
  );
}

// ── Movimentações ──────────────────────────────────────────────

const MOVES_SHOWN = 8;
type MoveFilter = "all" | "in" | "out";

function entryMeta(entry: MoneyEntry): string {
  if (entry.kind === "IN") return categoryLabel(entry.category);
  if (entry.billId) return `Conta fixa · ${categoryLabel(entry.category)}`;
  const method = entry.method && entry.method !== "CARTAO" ? METHOD_LABEL[entry.method] : null;
  return [categoryLabel(entry.category), method].filter(Boolean).join(" · ");
}

function MoveRow({ move }: { move: Movement }) {
  const open = useMoneySheet();
  const className = "grid grid-cols-[2.125rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-white/[0.03]";
  if (move.kind === "invoice") {
    return (
      <li>
        <Link href={`/dinheiro/cartoes/${move.card.id}?fatura=${move.month}`} className={cn(rowButton, className)}>
          <span className="flex size-[2.125rem] items-center justify-center rounded-[9px] bg-[#1c1c20] text-foreground-secondary">
            <CreditCard aria-hidden className="size-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">Fatura {move.card.name}</span>
            <span className="block truncate text-caption text-foreground-subtle">
              {move.count === 1 ? "1 lançamento" : `${move.count} lançamentos`} · categorias dentro da fatura
            </span>
          </span>
          <span className="text-right">
            <Money cents={move.totalCents} sign="−" className="block text-sm font-semibold" />
            <span className="block text-caption text-foreground-subtle">{shortDate(move.date)}</span>
          </span>
        </Link>
      </li>
    );
  }
  const { entry } = move;
  const income = entry.kind === "IN";
  const Icon = entry.billId ? Repeat : CATEGORY_ICON[entry.category];
  return (
    <li>
      <button type="button" onClick={() => open({ type: "entry", mode: "edit", id: entry.id })} className={cn(rowButton, className)}>
        <span
          className={cn(
            "flex size-[2.125rem] items-center justify-center rounded-[9px]",
            income ? "bg-green-tile text-green-ink" : "bg-[#1c1c20] text-foreground-secondary",
          )}
        >
          <Icon aria-hidden className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{entry.description}</span>
          <span className="block truncate text-caption text-foreground-subtle">{entryMeta(entry)}</span>
        </span>
        <span className="text-right">
          <Money cents={entry.amountCents} sign={income ? "+" : "−"} className={cn("block text-sm font-semibold", income && "text-green-ink")} />
          <span className="block text-caption text-foreground-subtle">{shortDate(entry.date)}</span>
        </span>
      </button>
    </li>
  );
}

export function Movements({ moves, month }: { moves: Movement[]; month: MonthKey }) {
  const [filter, setFilter] = useState<MoveFilter>("all");
  const [all, setAll] = useState(false);
  const filtered = moves.filter((m) => filter === "all" || (filter === "in") === (m.kind === "entry" && m.entry.kind === "IN"));
  const shown = all ? filtered : filtered.slice(0, MOVES_SHOWN);

  return (
    <>
      <div role="group" aria-label="Mostrar" className="mb-2 flex gap-1.5 px-1 pt-1">
        {(
          [
            ["all", "Tudo"],
            ["in", "Entradas"],
            ["out", "Gastos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-caption font-medium transition-colors duration-(--duration-fast)",
              filter === value ? "border-green-line bg-[#1f2a22] text-[#dcfce7]" : "border-border-strong bg-[#141417] text-foreground-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="px-2.5 py-3 text-sm text-foreground-secondary">
          {filter === "in" ? "Nenhuma entrada" : filter === "out" ? "Nenhum gasto" : "Nada lançado"} em {monthName(month)}.
        </p>
      ) : (
        <ul className="grid gap-0.5">
          {shown.map((move) => (
            <MoveRow key={move.kind === "entry" ? move.entry.id : `${move.card.id}-${move.month}`} move={move} />
          ))}
        </ul>
      )}
      {filtered.length > shown.length && (
        <div className="mt-1.5 flex justify-between border-t border-border px-2.5 pt-2.5 text-caption text-foreground-subtle">
          <span>
            Mostrando {shown.length} de {filtered.length}
          </span>
          <button type="button" onClick={() => setAll(true)} className="hover:text-foreground">
            Ver todas
          </button>
        </div>
      )}
    </>
  );
}

// ── Contas fixas ───────────────────────────────────────────────

function BillStatus({ state }: { state: BillState }) {
  if (state.kind === "card") return <span className="text-caption text-foreground-subtle">automático</span>;
  if (state.kind === "inactive") return <span className="text-caption text-foreground-subtle">não vale</span>;
  if (state.kind === "paid")
    return (
      <span className="inline-flex items-center gap-1 text-caption font-semibold text-[#6ee7b7]">
        <Check aria-hidden className="size-3" strokeWidth={2.5} />
        paga
      </span>
    );
  return <span className="text-caption font-semibold text-amber-ink">a pagar</span>;
}

export function BillList({ rows, cards, month }: { rows: { bill: MoneyBill; state: BillState }[]; cards: MoneyCard[]; month: MonthKey }) {
  const open = useMoneySheet();
  return (
    <>
      {rows.length > 0 && (
        <ul className="grid gap-0.5">
          {rows.map(({ bill, state }) => {
            const card = bill.cardId ? cards.find((c) => c.id === bill.cardId) : null;
            const amount = state.kind === "paid" ? state.entry.amountCents : bill.amountCents;
            return (
              <li key={bill.id}>
                <button
                  type="button"
                  onClick={() => open({ type: "bill", mode: "edit", id: bill.id, month })}
                  className={cn(rowButton, "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-white/[0.03]")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{bill.name}</span>
                    <span className="flex items-center gap-1 truncate text-caption text-foreground-subtle">
                      {card ? (
                        <>
                          <CreditCard aria-hidden className="size-3 shrink-0" strokeWidth={1.75} />
                          no {card.name} · entra na fatura
                        </>
                      ) : (
                        `todo dia ${bill.dueDay} · ${bill.variable ? "valor varia" : SPEND_LABEL[bill.category]}`
                      )}
                    </span>
                  </span>
                  <span className="text-right">
                    <Money cents={amount} approximate={bill.variable && state.kind !== "paid"} className="block text-[0.84375rem] font-semibold" />
                    <BillStatus state={state} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <AddLine label="Nova conta fixa" onClick={() => open({ type: "bill", mode: "new" })} />
    </>
  );
}

// ── Parcelas ───────────────────────────────────────────────────

export function InstallmentList({ items }: { items: ActiveInstallment[] }) {
  const open = useMoneySheet();
  if (items.length === 0) return <p className="px-2.5 py-3 text-sm text-foreground-secondary">Nenhuma compra parcelada em andamento.</p>;
  const perMonth = items.reduce((sum, i) => sum + i.perMonthCents, 0);
  return (
    <>
      <ul className="grid gap-0.5">
        {items.map((item) => {
          const last = item.current === item.entry.installments;
          return (
            <li key={item.entry.id}>
              <button
                type="button"
                onClick={() => open({ type: "entry", mode: "edit", id: item.entry.id })}
                className={cn(rowButton, "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-white/[0.03]")}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{item.entry.description}</span>
                    <span className="tabular shrink-0 rounded-[5px] bg-green-ink/10 px-1.5 font-mono text-[0.71875rem] font-semibold text-green-ink">
                      {item.current}/{item.entry.installments}
                    </span>
                  </span>
                  <span className="block truncate text-caption text-foreground-subtle">
                    {item.card.name} · {last ? `última na fatura de ${monthName(item.lastMonth)}` : `termina em ${monthShort(item.lastMonth)}`}
                  </span>
                </span>
                <span className="text-right">
                  <Money cents={item.perMonthCents} className="block text-[0.84375rem] font-semibold" />
                  <span className="block text-caption text-foreground-subtle">por mês</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-1.5 flex justify-between border-t border-border px-2.5 pt-2.5 text-caption text-foreground-subtle">
        <span>Por mês em parcelas</span>
        <Money cents={perMonth} className="font-medium text-foreground-secondary" />
      </div>
    </>
  );
}

// ── Pagamentos futuros ─────────────────────────────────────────

function plannedWhen(date: string, today: string): string {
  const diff = daysBetween(today, date);
  if (diff < 0) return dueLabel(date, today);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff <= 45) return `em ${diff} dias`;
  return monthShort(date.slice(0, 7));
}

export function PlannedList({ entries, today }: { entries: MoneyEntry[]; today: string }) {
  const open = useMoneySheet();
  return (
    <>
      {entries.length > 0 && (
        <ul className="grid gap-0.5">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => open({ type: "entry", mode: "edit", id: entry.id })}
                className={cn(rowButton, "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-white/[0.03]")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{entry.description}</span>
                  <span className="block truncate text-caption text-foreground-subtle">
                    {capitalize(WEEKDAYS_SHORT[weekday(entry.date)].toLowerCase())}, {shortDate(entry.date)} · {categoryLabel(entry.category)}
                  </span>
                </span>
                <span className="text-right">
                  <Money cents={entry.amountCents} approximate={entry.approximate} className="block text-[0.84375rem] font-semibold" />
                  <span className={cn("block text-caption", entry.date < today ? "text-amber-ink" : "text-foreground-subtle")}>{plannedWhen(entry.date, today)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddLine label="Novo pagamento futuro" onClick={() => open({ type: "entry", mode: "new", kind: "OUT", planned: true })} />
    </>
  );
}

function AddLine({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-dashed border-border-strong px-3 text-left text-sm text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground"
    >
      <Plus aria-hidden className="size-4" strokeWidth={1.75} />
      {label}
    </button>
  );
}
