"use client";

import { useState, useTransition } from "react";
import { Calendar, Check, CircleDot, CreditCard, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { ActionFailure } from "@/lib/actions/resilient";
import { dueLabel } from "@/lib/dates";
import { centsToInput, parseMoney, SPEND_LABEL, INCOME_LABEL } from "@/lib/dinheiro/format";
import type { LinkedTask } from "@/lib/dinheiro/keys";
import { INCOME_CATEGORIES, SPEND_CATEGORIES, type MoneyCard, type MoneyCategory } from "@/types/money";
import { cn } from "@/lib/utils";

export const fieldClass =
  "h-12 w-full min-w-0 rounded-md border border-border bg-surface px-3.5 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none disabled:opacity-40 [color-scheme:dark]";

export const greenChip = (selected: boolean) =>
  cn(
    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast)",
    selected ? "border-green-line bg-green-tile text-[#dcfce7]" : "border-border text-foreground-secondary hover:bg-elevated/60 active:bg-elevated",
  );

/** Botão verde de "Marcar como paga" (mesmo tom do "Marcar como entregue" da Faculdade). */
export const doneButton = "border-[#1f5b44] bg-[#0f2a20] text-[#bbf7d0] hover:bg-[#123626]";

/** Cabeçalho da gaveta: alça, título e uma linha de apoio. */
export function SheetHead({ title, description, right }: { title: string; description: string; right?: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <DrawerTitle className="truncate text-left text-title font-semibold">{title}</DrawerTitle>
          <DrawerDescription className="mt-0.5 truncate text-left text-caption text-foreground-subtle">{description}</DrawerDescription>
        </div>
        {right}
      </div>
    </>
  );
}

/** O campo grande de valor ("R$ 459,90"). */
export function AmountField({ id, value, onChange, autoFocus }: { id: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label htmlFor={id} className="flex h-16 items-baseline gap-2 rounded-[10px] border border-border bg-surface px-4 focus-within:border-primary-soft">
      <span className="text-lg text-foreground-subtle">R$</span>
      <input
        id={id}
        autoFocus={autoFocus}
        inputMode="decimal"
        autoComplete="off"
        aria-label="Valor"
        placeholder="0,00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular h-full min-w-0 flex-1 bg-transparent text-[2rem] leading-none font-semibold tracking-tight text-foreground placeholder:text-foreground-subtle focus-visible:outline-none"
      />
    </label>
  );
}

export function CategoryChips({
  labelId,
  kind,
  value,
  onChange,
}: {
  labelId: string;
  kind: "IN" | "OUT";
  value: MoneyCategory | null;
  onChange: (c: MoneyCategory) => void;
}) {
  const options = kind === "OUT" ? SPEND_CATEGORIES.map((c) => [c, SPEND_LABEL[c]] as const) : INCOME_CATEGORIES.map((c) => [c, INCOME_LABEL[c]] as const);
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {options.map(([code, label]) => (
        <button key={code} type="button" aria-pressed={value === code} onClick={() => onChange(code)} className={greenChip(value === code)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Escolha de um cartão (ou "Pix / boleto" quando `none` vem). */
export function CardChips({
  labelId,
  cards,
  value,
  onChange,
  none,
  lead,
}: {
  labelId: string;
  cards: MoneyCard[];
  value: string | null;
  onChange: (id: string | null) => void;
  none?: { label: string; icon: LucideIcon };
  /** Chips antes dos cartões (Pix, Dinheiro, Débito). */
  lead?: React.ReactNode;
}) {
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {lead}
      {none && (
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={greenChip(value === null)}>
          <none.icon aria-hidden className="size-4" strokeWidth={1.75} />
          {none.label}
        </button>
      )}
      {cards.map((card) => (
        <button key={card.id} type="button" aria-pressed={value === card.id} onClick={() => onChange(card.id)} className={greenChip(value === card.id)}>
          <CreditCard aria-hidden className="size-4" strokeWidth={1.75} />
          {card.name}
        </button>
      ))}
    </div>
  );
}

/** Dia do mês (1–31) num seletor — no celular abre a roda nativa. */
export function DaySelect({ id, value, onChange, label }: { id: string; value: number; onChange: (d: number) => void; label: string }) {
  return (
    <label className="relative block">
      <Calendar aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground-subtle" strokeWidth={1.75} />
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} className={cn(fieldClass, "appearance-none pl-10")}>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            dia {d}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Passo de "Marcar como paga": quanto foi e quando. Já vem com o previsto e a data de hoje;
 * em conta de valor que varia, o valor fica em destaque para conferir.
 */
export function PayStep({
  title,
  description,
  amountCents,
  date,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  amountCents: number;
  date: string;
  onConfirm: (pay: { amountCents: number; date: string }) => Promise<{ ok: boolean } | ActionFailure>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(centsToInput(amountCents));
  const [day, setDay] = useState(date);
  const [pending, startTransition] = useTransition();

  function confirm() {
    const cents = parseMoney(amount);
    if (!cents) return void toast.error("Use um valor como 89,90.");
    if (!day) return void toast.error("Escolha a data.");
    startTransition(async () => {
      const result = await onConfirm({ amountCents: cents, date: day });
      if (!result.ok) toast.error("error" in result ? result.error : "Não deu para salvar agora.");
    });
  }

  return (
    <div className="flex flex-col px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
      <SheetHead title={title} description={description} />
      <div className="mt-5 flex flex-col gap-4">
        <AmountField id="pagar-valor" value={amount} onChange={setAmount} autoFocus />
        <label className="relative block">
          <Calendar aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground-subtle" strokeWidth={1.75} />
          <input type="date" aria-label="Data do pagamento" value={day} onChange={(e) => setDay(e.target.value)} className={cn(fieldClass, "pl-10")} />
        </label>
      </div>
      <Button size="touch" disabled={pending} onClick={confirm} className={cn("mt-6 w-full", doneButton)}>
        <Check aria-hidden strokeWidth={2} />
        Confirmar
      </Button>
      <Button size="touch" variant="ghost" disabled={pending} onClick={onCancel} className="mt-2 w-full">
        Voltar
      </Button>
    </div>
  );
}

/** Ação do PULSO ligada (ou o botão para criar uma). */
export function LinkedTaskRow({ task, today }: { task: LinkedTask; today: string }) {
  return (
    <a
      href={`/tarefas/${task.taskId}`}
      className="flex min-h-12 items-center gap-3 rounded-lg border border-[#2f3461] bg-[#0f1020] px-3 py-2 transition-colors duration-(--duration-fast) hover:bg-[#15172c]"
    >
      <CircleDot aria-hidden className="size-4 shrink-0 text-primary-soft" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="block text-caption text-foreground-subtle">
          Dinheiro{task.dueDate ? ` · prazo ${dueLabel(task.dueDate, today).toLocaleLowerCase("pt-BR")}` : ""}
        </span>
      </span>
    </a>
  );
}

/** "Virar ação": botão azul-escuro, igual ao da maquete. */
export const actionButton = "border-[#2f3461] bg-[#0f1020] text-[#c7cbff] hover:bg-[#15172c]";
