"use client";

import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Calendar, Check, CircleDot, Landmark, Minus, Plus, Trash2, Undo2, Zap, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { AttributeRow } from "@/components/tasks/attribute-row";
import { createEntry, createMoneyTask, deleteEntry, payPlanned, updateEntry } from "@/lib/actions/client";
import { datePill, shortDate } from "@/lib/dates";
import { categoryLabel, centsToInput, formatCents, parseMoney, splitInstallments } from "@/lib/dinheiro/format";
import { dueDate, invoiceMonthFor } from "@/lib/dinheiro/invoices";
import { monthName, monthOf } from "@/lib/dinheiro/months";
import type { LinkedTask } from "@/lib/dinheiro/keys";
import type { MoneyCard, MoneyCategory, MoneyEntry, PayMethod } from "@/types/money";
import { cn } from "@/lib/utils";
import { AmountField, CardChips, CategoryChips, LinkedTaskRow, PayStep, SheetHead, actionButton, doneButton, fieldClass, greenChip } from "./form-parts";

const METHODS: { method: Exclude<PayMethod, "CARTAO">; label: string; icon: LucideIcon }[] = [
  { method: "PIX", label: "Pix", icon: Zap },
  { method: "DINHEIRO", label: "Dinheiro", icon: Banknote },
  { method: "DEBITO", label: "Débito", icon: Landmark },
];

export type EntryTarget =
  | { mode: "new"; kind: "IN" | "OUT"; planned?: boolean; cardId?: string | null }
  | { mode: "edit"; entry: MoneyEntry };

/** "3 × R$ 153,30. A primeira vem na fatura de novembro (vence 5 nov)." */
function installmentHint(card: MoneyCard, date: string, amountCents: number | null, installments: number): string {
  const first = invoiceMonthFor(card, date);
  const due = shortDate(dueDate(card, first));
  if (installments === 1) return `Entra na fatura de ${monthName(first)} (vence ${due}).`;
  const each = amountCents ? `${installments} × ${formatCents(splitInstallments(amountCents, installments).at(-1)!)}. ` : "";
  return `${each}A primeira vem na fatura de ${monthName(first)} (vence ${due}).`;
}

/**
 * Gasto, entrada ou pagamento futuro — novo ou aberto. Salva no botão (valor é coisa que
 * se confere antes). Pagamento de conta fixa abre aqui também, só com valor e data.
 */
export function EntryForm({
  target,
  cards,
  today,
  linked,
  onDone,
}: {
  target: EntryTarget;
  /** Cartões que dá para escolher (o da própria compra entra mesmo guardado). */
  cards: MoneyCard[];
  today: string;
  linked: LinkedTask | null;
  onDone: () => void;
}) {
  const entry = target.mode === "edit" ? target.entry : null;
  const planned = entry ? entry.planned : target.mode === "new" && !!target.planned;
  const billPayment = !!entry?.billId;

  const [kind, setKind] = useState<"IN" | "OUT">(entry?.kind ?? (target.mode === "new" ? target.kind : "OUT"));
  const [amount, setAmount] = useState(entry ? centsToInput(entry.amountCents) : "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [category, setCategory] = useState<MoneyCategory | null>(entry?.category ?? null);
  const initialCard = entry?.cardId ?? (target.mode === "new" ? (target.cardId ?? null) : null);
  const [method, setMethod] = useState<PayMethod | null>(entry ? entry.method : initialCard ? "CARTAO" : "PIX");
  const [cardId, setCardId] = useState<string | null>(initialCard);
  const [date, setDate] = useState(entry?.date ?? today);
  const [installments, setInstallments] = useState(entry?.installments ?? 1);
  const [approximate, setApproximate] = useState(entry?.approximate ?? false);
  const [step, setStep] = useState<"form" | "pay" | "delete">("form");
  const [pending, startTransition] = useTransition();

  const out = kind === "OUT";
  const showMethod = out && !planned && !billPayment;
  const card = method === "CARTAO" ? cards.find((c) => c.id === cardId) : undefined;
  const cents = parseMoney(amount);

  function switchKind(next: "IN" | "OUT") {
    if (next === kind) return;
    setKind(next);
    setCategory(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!cents) return void toast.error("Use um valor como 89,90.");
    if (!description.trim()) return void toast.error(out ? "Dê um nome para o gasto." : "Dê um nome para a entrada.");
    if (!category) return void toast.error(out ? "Escolha a categoria." : "Escolha o tipo.");
    if (method === "CARTAO" && !cardId) return void toast.error("Escolha o cartão.");
    const input = {
      kind,
      amountCents: cents,
      description,
      category,
      date,
      method: showMethod ? method : null,
      cardId: showMethod && method === "CARTAO" ? cardId : null,
      installments: showMethod && method === "CARTAO" ? installments : 1,
      planned,
      approximate: planned && approximate,
    };
    startTransition(async () => {
      const result = entry ? await updateEntry(entry.id, input) : await createEntry(input);
      if (!result.ok) return void toast.error(result.error);
      toast(entry ? "Salvo." : planned ? "Pagamento futuro anotado." : out ? "Gasto lançado." : "Entrada lançada.");
      onDone();
    });
  }

  function remove() {
    if (!entry) return;
    startTransition(async () => {
      const result = await deleteEntry(entry.id);
      if (!result.ok) {
        setStep("form");
        return void toast.error(result.error);
      }
      toast(billPayment ? "Pagamento desfeito." : `“${entry.description}” apagado.`);
      onDone();
    });
  }

  function makeTask() {
    if (!entry) return;
    startTransition(async () => {
      const result = await createMoneyTask({ kind: "planned", id: entry.id });
      if (!result.ok) return void toast.error(result.error);
      toast("Ação criada no PULSO.");
    });
  }

  if (step === "pay" && entry) {
    return (
      <PayStep
        title={`${entry.description} paga?`}
        description="Vira um gasto com o valor e a data de verdade."
        amountCents={entry.amountCents}
        date={today}
        onCancel={() => setStep("form")}
        onConfirm={async (pay) => {
          const result = await payPlanned(entry.id, pay);
          if (result.ok) {
            toast("Marcado como pago.");
            onDone();
          }
          return result;
        }}
      />
    );
  }

  if (step === "delete" && entry) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
        <DrawerTitle className="text-left text-title font-semibold">
          {billPayment ? "Desfazer o pagamento?" : `Apagar “${entry.description}”?`}
        </DrawerTitle>
        <DrawerDescription className="text-left text-sm text-foreground-secondary">
          {billPayment
            ? `A conta volta para “a pagar” em ${monthName(entry.billMonth ?? monthOf(entry.date))}.`
            : entry.installments > 1
              ? "Todas as parcelas saem das faturas."
              : "Sai das movimentações e do resumo do mês."}
        </DrawerDescription>
        <Button size="touch" disabled={pending} onClick={remove} className="w-full">
          {billPayment ? "Desfazer pagamento" : "Apagar"}
        </Button>
        <Button size="touch" variant="ghost" disabled={pending} onClick={() => setStep("form")} className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  const title = entry ? entry.description : planned ? "Pagamento futuro" : out ? "Novo gasto" : "Nova entrada";
  const subtitle = entry
    ? [categoryLabel(entry.category), billPayment ? "conta fixa paga" : planned ? `vence ${datePill(entry.date).toLowerCase()}` : datePill(entry.date)].join(" · ")
    : planned
      ? "Algo que você já sabe que vai pagar."
      : out
        ? "Pix, dinheiro, débito ou cartão."
        : "Salário, freela ou outro recebimento.";

  return (
    <form onSubmit={submit} className="flex max-h-[88dvh] flex-col overflow-y-auto px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
      <SheetHead title={title} description={subtitle} />

      {target.mode === "new" && !planned && (
        <div role="group" aria-label="Tipo" className="mt-4 grid grid-cols-2 gap-1 rounded-[10px] border border-border bg-surface p-1">
          {(
            [
              ["OUT", "Gasto", ArrowUpRight],
              ["IN", "Entrada", ArrowDownLeft],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => switchKind(value)}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-[7px] text-sm font-medium transition-colors duration-(--duration-fast)",
                kind === value ? "bg-[#1f1f24] text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-foreground-secondary",
              )}
            >
              <Icon aria-hidden className="size-4" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <AmountField id="lancar-valor" value={amount} onChange={setAmount} autoFocus={target.mode === "new"} />
      </div>
      {!billPayment && (
        <>
          <label htmlFor="lancar-descricao" className="sr-only">
            Descrição
          </label>
          <input
            id="lancar-descricao"
            autoComplete="off"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={planned ? "Ex.: Revisão da moto" : out ? "Ex.: Mercado" : "Ex.: Salário"}
            className={cn(fieldClass, "mt-2.5")}
          />
        </>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {planned && (
          <button type="button" aria-pressed={approximate} onClick={() => setApproximate(!approximate)} className={cn(greenChip(approximate), "self-start")}>
            {approximate && <Check aria-hidden className="size-4" strokeWidth={2} />}
            Valor aproximado
          </button>
        )}

        {!billPayment && (
          <AttributeRow id="lancar-categoria" label={out ? "Categoria" : "Tipo"}>
            <CategoryChips labelId="lancar-categoria" kind={kind} value={category} onChange={setCategory} />
          </AttributeRow>
        )}

        {showMethod && (
          <AttributeRow id="lancar-forma" label="Como pagou">
            <CardChips
              labelId="lancar-forma"
              cards={cards}
              value={method === "CARTAO" ? cardId : null}
              onChange={(id) => {
                setMethod("CARTAO");
                setCardId(id);
              }}
              lead={METHODS.map(({ method: m, label, icon: Icon }) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => {
                    setMethod(m);
                    setCardId(null);
                    setInstallments(1);
                  }}
                  className={greenChip(method === m)}
                >
                  <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            />
          </AttributeRow>
        )}

        <div className={cn("grid gap-2.5", card ? "grid-cols-2" : "grid-cols-1")}>
          <div className="flex flex-col gap-3">
            <h3 id="lancar-data" className="text-sm font-medium text-foreground-secondary">
              {planned ? "Quando vence" : billPayment ? "Pago em" : out ? "Data" : "Recebido em"}
            </h3>
            <label className="relative block">
              <Calendar aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground-subtle" strokeWidth={1.75} />
              <input type="date" aria-labelledby="lancar-data" value={date} onChange={(e) => setDate(e.target.value || today)} className={cn(fieldClass, "pl-10")} />
            </label>
          </div>
          {card && (
            <div className="flex flex-col gap-3">
              <h3 id="lancar-parcelas" className="text-sm font-medium text-foreground-secondary">
                Parcelas
              </h3>
              <div role="group" aria-labelledby="lancar-parcelas" className="flex h-12 items-stretch overflow-hidden rounded-md border border-border bg-surface">
                <button
                  type="button"
                  aria-label="Menos parcelas"
                  disabled={installments <= 1}
                  onClick={() => setInstallments((n) => Math.max(1, n - 1))}
                  className="flex w-12 items-center justify-center text-foreground-secondary disabled:opacity-40"
                >
                  <Minus aria-hidden className="size-4" strokeWidth={1.75} />
                </button>
                <span aria-live="polite" className="tabular flex flex-1 items-center justify-center border-x border-border text-body font-semibold">
                  {installments}×
                </span>
                <button
                  type="button"
                  aria-label="Mais parcelas"
                  disabled={installments >= 24}
                  onClick={() => setInstallments((n) => Math.min(24, n + 1))}
                  className="flex w-12 items-center justify-center text-foreground-secondary disabled:opacity-40"
                >
                  <Plus aria-hidden className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </div>
        {card && <p className="-mt-3 text-caption text-foreground-subtle">{installmentHint(card, date, cents ?? null, installments)}</p>}

        {planned && entry && (
          <AttributeRow id="lancar-acao" label="Ação no PULSO">
            {linked ? (
              <LinkedTaskRow task={linked} today={today} />
            ) : (
              <p className="text-caption text-foreground-subtle">Nada ainda. Se decidir pagar num dia, “Virar ação” coloca no PULSO com prazo.</p>
            )}
          </AttributeRow>
        )}
      </div>

      {planned && entry && (
        <div className="mt-7 flex shrink-0 gap-2.5">
          <Button type="button" size="touch" disabled={pending} onClick={() => setStep("pay")} className={cn("flex-1", doneButton)}>
            <Check aria-hidden strokeWidth={2} />
            Marcar como paga
          </Button>
          {!linked && (
            <Button type="button" size="touch" variant="secondary" disabled={pending} onClick={makeTask} className={cn("flex-1", actionButton)}>
              <CircleDot aria-hidden strokeWidth={1.75} />
              Virar ação
            </Button>
          )}
        </div>
      )}

      <div className={cn("flex shrink-0 gap-2.5", planned && entry ? "mt-2.5" : "mt-7")}>
        <Button type="submit" size="touch" variant={planned && entry ? "secondary" : "default"} disabled={pending || !cents} className="flex-1">
          {entry ? "Salvar alterações" : planned ? "Anotar pagamento" : out ? "Salvar gasto" : "Salvar entrada"}
        </Button>
        {entry && (
          <Button
            type="button"
            size="touch"
            variant="secondary"
            disabled={pending}
            onClick={() => setStep("delete")}
            aria-label={billPayment ? "Desfazer pagamento" : "Apagar"}
            title={billPayment ? "Desfazer pagamento" : "Apagar"}
            className="w-12 px-0"
          >
            {billPayment ? <Undo2 aria-hidden strokeWidth={1.75} /> : <Trash2 aria-hidden strokeWidth={1.75} />}
          </Button>
        )}
      </div>
    </form>
  );
}
