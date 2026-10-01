"use client";

import { useState, useTransition } from "react";
import { AlarmClock, Check, CircleDot, CreditCard, Undo2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { AttributeRow } from "@/components/tasks/attribute-row";
import { createBill, createMoneyTask, endBill, payBill, unpayBill, updateBill } from "@/lib/actions/client";
import { dueLabel, shortDate } from "@/lib/dates";
import { SPEND_LABEL, centsToInput, parseMoney } from "@/lib/dinheiro/format";
import { monthName } from "@/lib/dinheiro/months";
import type { LinkedTask } from "@/lib/dinheiro/keys";
import type { BillState } from "@/lib/dinheiro/summary";
import type { MoneyBill, MoneyCard, MoneyEntry, MonthKey, SpendCategory } from "@/types/money";
import { cn } from "@/lib/utils";
import { Money } from "./money";
import { AmountField, CardChips, CategoryChips, DaySelect, LinkedTaskRow, PayStep, SheetHead, actionButton, doneButton, fieldClass, greenChip } from "./form-parts";

export type BillTarget = { mode: "new" } | { mode: "edit"; bill: MoneyBill; month: MonthKey; state: BillState };

/** Faixa de cima da conta aberta: vence hoje / a pagar / paga / no cartão. */
function StatusBand({ bill, month, state, today, cards }: { bill: MoneyBill; month: MonthKey; state: BillState; today: string; cards: MoneyCard[] }) {
  if (state.kind === "card") {
    const card = cards.find((c) => c.id === bill.cardId);
    return (
      <div className="flex items-center gap-3 rounded-[10px] border border-green-line bg-green-tile/40 px-3.5 py-3">
        <CreditCard aria-hidden className="size-5 text-green-ink" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 text-sm">Entra sozinha na fatura{card ? ` do ${card.name}` : ""} todo mês.</span>
      </div>
    );
  }
  if (state.kind === "inactive") {
    return <p className="rounded-[10px] border border-border px-3.5 py-3 text-sm text-foreground-secondary">Não vale em {monthName(month)}.</p>;
  }
  if (state.kind === "paid") {
    return (
      <div className="flex items-center gap-3 rounded-[10px] border border-[#1f5b44] bg-[#0f2a20] px-3.5 py-3">
        <Check aria-hidden className="size-5 text-[#6ee7b7]" strokeWidth={2} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Paga em {shortDate(state.entry.date)}</span>
          <span className="block text-caption text-white/60">{monthName(month)}</span>
        </span>
        <Money cents={state.entry.amountCents} className="text-lg font-semibold" />
      </div>
    );
  }
  const label = dueLabel(state.date, today);
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-amber-line bg-[linear-gradient(160deg,var(--amber-a),var(--amber-b))] px-3.5 py-3">
      <AlarmClock aria-hidden className="size-5 text-amber-ink" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label === "Hoje" ? "Vence hoje" : state.date < today ? label : `Vence ${label.toLowerCase()}`}</span>
        <span className="block text-caption text-white/60">{monthName(month)} · ainda não paga</span>
      </span>
      <Money cents={bill.amountCents} approximate={bill.variable} className="text-lg font-semibold" />
    </div>
  );
}

/**
 * Conta fixa: nova ou aberta. Aberta mostra como está no mês, os últimos pagamentos e os
 * botões de pagar e de "Virar ação". Os campos salvam no botão.
 */
export function BillForm({
  target,
  cards,
  history,
  today,
  linked,
  onDone,
}: {
  target: BillTarget;
  cards: MoneyCard[];
  history: MoneyEntry[];
  today: string;
  linked: LinkedTask | null;
  onDone: () => void;
}) {
  const bill = target.mode === "edit" ? target.bill : null;
  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill ? centsToInput(bill.amountCents) : "");
  const [variable, setVariable] = useState(bill?.variable ?? false);
  const [dueDay, setDueDay] = useState(bill?.dueDay ?? 10);
  const [category, setCategory] = useState<SpendCategory | null>(bill?.category ?? null);
  const [cardId, setCardId] = useState<string | null>(bill?.cardId ?? null);
  const [step, setStep] = useState<"form" | "pay" | "end">("form");
  const [pending, startTransition] = useTransition();

  const cents = parseMoney(amount);
  const dirty =
    !bill ||
    name.trim() !== bill.name ||
    cents !== bill.amountCents ||
    variable !== bill.variable ||
    dueDay !== bill.dueDay ||
    category !== bill.category ||
    cardId !== bill.cardId;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return void toast.error("Dê um nome para a conta.");
    if (!cents) return void toast.error("Use um valor como 89,90.");
    if (!category) return void toast.error("Escolha a categoria.");
    const input = { name, amountCents: cents, variable, dueDay, category, cardId };
    startTransition(async () => {
      const result = bill ? await updateBill(bill.id, input) : await createBill(input);
      if (!result.ok) return void toast.error(result.error);
      toast(bill ? "Salvo." : "Conta fixa anotada.");
      if (!bill) onDone();
    });
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string, close = false) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      toast(message);
      if (close) onDone();
    });
  }

  if (target.mode === "edit" && step === "pay") {
    return (
      <PayStep
        title={`${target.bill.name} paga?`}
        description={`Vira um gasto de ${monthName(target.month)} em ${SPEND_LABEL[target.bill.category]}.`}
        amountCents={target.bill.amountCents}
        date={today}
        onCancel={() => setStep("form")}
        onConfirm={async (pay) => {
          const result = await payBill(target.bill.id, target.month, pay);
          if (result.ok) {
            toast("Marcada como paga.");
            setStep("form");
          }
          return result;
        }}
      />
    );
  }

  if (target.mode === "edit" && step === "end") {
    return (
      <div className="flex flex-col gap-3 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
        <DrawerTitle className="text-left text-title font-semibold">Encerrar “{target.bill.name}”?</DrawerTitle>
        <DrawerDescription className="text-left text-sm text-foreground-secondary">
          Some das próximas contas e dos vencimentos. O que já foi pago continua nos gastos.
        </DrawerDescription>
        <Button size="touch" disabled={pending} onClick={() => run(() => endBill(target.bill.id), "Conta encerrada.", true)} className="w-full">
          Encerrar conta
        </Button>
        <Button size="touch" variant="ghost" disabled={pending} onClick={() => setStep("form")} className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  const state = target.mode === "edit" ? target.state : null;

  return (
    <form onSubmit={submit} className="flex max-h-[88dvh] flex-col overflow-y-auto px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
      <SheetHead
        title={bill ? name || bill.name : "Nova conta fixa"}
        description={bill ? `Todo dia ${bill.dueDay} · ${SPEND_LABEL[bill.category]}` : "Todo mês, no mesmo dia: aluguel, luz, internet, academia…"}
      />

      {target.mode === "edit" && state && (
        <div className="mt-4">
          <StatusBand bill={target.bill} month={target.month} state={state} today={today} cards={cards} />
        </div>
      )}

      <label htmlFor="conta-nome" className="sr-only">
        Nome
      </label>
      <input
        id="conta-nome"
        autoFocus={!bill}
        autoComplete="off"
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Academia"
        className={cn(fieldClass, "mt-4")}
      />

      <div className="mt-6 flex flex-col gap-6">
        <AttributeRow id="conta-valor" label={variable ? "Valor aproximado" : "Valor"}>
          <AmountField id="conta-valor-campo" value={amount} onChange={setAmount} />
          <button type="button" aria-pressed={variable} onClick={() => setVariable(!variable)} className={cn(greenChip(variable), "self-start")}>
            {variable && <Check aria-hidden className="size-4" strokeWidth={2} />}
            O valor varia (luz, água…)
          </button>
        </AttributeRow>

        <AttributeRow id="conta-dia" label="Vence todo">
          <DaySelect id="conta-dia-campo" label="Dia do vencimento" value={dueDay} onChange={setDueDay} />
        </AttributeRow>

        <AttributeRow id="conta-categoria" label="Categoria">
          <CategoryChips labelId="conta-categoria" kind="OUT" value={category} onChange={(c) => setCategory(c as SpendCategory)} />
        </AttributeRow>

        <AttributeRow
          id="conta-forma"
          label="Como paga"
          hint={cardId ? "No cartão ela entra sozinha na fatura todo mês — não precisa marcar como paga." : undefined}
        >
          <CardChips labelId="conta-forma" cards={cards} value={cardId} onChange={setCardId} none={{ label: "Pix / boleto", icon: Zap }} />
        </AttributeRow>

        {bill && history.length > 0 && (
          <AttributeRow id="conta-historico" label="Últimos meses">
            <ul className="rounded-[10px] border border-border bg-surface px-3">
              {history.slice(0, 3).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-b-0">
                  <span className="text-foreground-secondary first-letter:uppercase">{monthName(e.billMonth ?? e.date.slice(0, 7))}</span>
                  <span className="flex items-center gap-2.5">
                    <Money cents={e.amountCents} className="font-medium" />
                    <span className="flex items-center gap-1 text-caption font-semibold text-[#6ee7b7]">
                      <Check aria-hidden className="size-3" strokeWidth={2.5} />
                      paga {shortDate(e.date)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </AttributeRow>
        )}

        {target.mode === "edit" && state?.kind === "due" && (
          <AttributeRow id="conta-acao" label="Ação no PULSO">
            {linked ? (
              <LinkedTaskRow task={linked} today={today} />
            ) : (
              <p className="text-caption text-foreground-subtle">Se decidir pagar num dia, “Virar ação” coloca “Pagar {target.bill.name}” no PULSO.</p>
            )}
          </AttributeRow>
        )}
      </div>

      {target.mode === "edit" && state?.kind === "due" && (
        <div className="mt-7 flex shrink-0 gap-2.5">
          <Button type="button" size="touch" disabled={pending} onClick={() => setStep("pay")} className={cn("flex-1", doneButton)}>
            <Check aria-hidden strokeWidth={2} />
            Marcar como paga
          </Button>
          {!linked && (
            <Button
              type="button"
              size="touch"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => createMoneyTask({ kind: "bill", id: target.bill.id, month: target.month }), "Ação criada no PULSO.")}
              className={cn("flex-1", actionButton)}
            >
              <CircleDot aria-hidden strokeWidth={1.75} />
              Virar ação
            </Button>
          )}
        </div>
      )}
      {target.mode === "edit" && state?.kind === "paid" && (
        <Button
          type="button"
          size="touch"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => unpayBill(target.bill.id, target.month), "Pagamento desfeito.")}
          className="mt-7 w-full shrink-0"
        >
          <Undo2 aria-hidden strokeWidth={1.75} />
          Desfazer pagamento
        </Button>
      )}

      <div className={cn("flex shrink-0 gap-2.5", target.mode === "edit" && (state?.kind === "due" || state?.kind === "paid") ? "mt-2.5" : "mt-7")}>
        <Button type="submit" size="touch" variant={bill ? "secondary" : "default"} disabled={pending || !dirty} className="flex-1">
          {bill ? "Salvar alterações" : "Salvar conta"}
        </Button>
        {bill && (
          <Button type="button" size="touch" variant="ghost" disabled={pending} onClick={() => setStep("end")} className="shrink-0 text-foreground-secondary">
            Encerrar
          </Button>
        )}
      </div>
    </form>
  );
}
