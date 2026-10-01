"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AttributeRow } from "@/components/tasks/attribute-row";
import { createCard, deleteCard, setCardArchived, updateCard } from "@/lib/actions/client";
import { centsToInput, parseMoney } from "@/lib/dinheiro/format";
import type { MoneyCard } from "@/types/money";
import { cn } from "@/lib/utils";
import { DaySelect, SheetHead, fieldClass } from "./form-parts";

/** Cartão: nome, fechamento, vencimento e limite (opcional). Salva no botão. */
export function CardForm({ card, onDone }: { card: MoneyCard | null; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(card?.name ?? "");
  const [closingDay, setClosingDay] = useState(card?.closingDay ?? 28);
  const [dueDay, setDueDay] = useState(card?.dueDay ?? 5);
  const [limit, setLimit] = useState(card?.limitCents ? centsToInput(card.limitCents) : "");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return void toast.error("Dê um nome para o cartão.");
    const limitCents = parseMoney(limit);
    if (limitCents === undefined) return void toast.error("Use um valor como 3.000 no limite.");
    const input = { name, closingDay, dueDay, limitCents };
    startTransition(async () => {
      const result = card ? await updateCard(card.id, input) : await createCard(input);
      if (!result.ok) return void toast.error(result.error);
      toast(card ? "Salvo." : "Cartão criado.");
      onDone();
      if (!card && "id" in result) router.push(`/dinheiro/cartoes/${result.id}`);
    });
  }

  function archive() {
    if (!card) return;
    startTransition(async () => {
      const result = await setCardArchived(card.id, !card.archivedAt);
      if (!result.ok) return void toast.error(result.error);
      toast(card.archivedAt ? "Cartão de volta." : "Cartão guardado. As compras continuam contando.");
      onDone();
    });
  }

  function remove() {
    if (!card) return;
    startTransition(async () => {
      const result = await deleteCard(card.id);
      if (!result.ok) return void toast.error(result.error);
      toast("Cartão apagado.");
      onDone();
      router.push("/dinheiro");
    });
  }

  return (
    <form onSubmit={submit} className="flex max-h-[88dvh] flex-col overflow-y-auto px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
      <SheetHead title={card ? card.name : "Novo cartão"} description="A fatura se soma sozinha com as compras, parcelas e contas no cartão." />

      <label htmlFor="cartao-nome" className="sr-only">
        Nome
      </label>
      <input
        id="cartao-nome"
        autoFocus={!card}
        autoComplete="off"
        maxLength={60}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Nubank"
        className={cn(fieldClass, "mt-4")}
      />

      <div className="mt-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-2.5">
          <AttributeRow id="cartao-fecha" label="Fecha">
            <DaySelect id="cartao-fecha-campo" label="Dia do fechamento" value={closingDay} onChange={setClosingDay} />
          </AttributeRow>
          <AttributeRow id="cartao-vence" label="Vence">
            <DaySelect id="cartao-vence-campo" label="Dia do vencimento" value={dueDay} onChange={setDueDay} />
          </AttributeRow>
        </div>
        <p className="-mt-3 text-caption text-foreground-subtle">Compra feita no dia do fechamento já vai para a fatura seguinte.</p>

        <AttributeRow id="cartao-limite" label="Limite">
          <label className="flex h-12 items-center gap-2 rounded-md border border-border bg-surface px-3.5 focus-within:border-primary-soft">
            <span className="text-foreground-subtle">R$</span>
            <input
              aria-labelledby="cartao-limite"
              inputMode="decimal"
              autoComplete="off"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="Opcional"
              className="tabular h-full min-w-0 flex-1 bg-transparent text-body text-foreground placeholder:text-foreground-subtle focus-visible:outline-none"
            />
          </label>
        </AttributeRow>
      </div>

      <Button type="submit" size="touch" disabled={pending || !name.trim()} className="mt-7 w-full shrink-0">
        {card ? "Salvar alterações" : "Salvar cartão"}
      </Button>
      {card && (
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Button type="button" size="touch" variant="secondary" disabled={pending} onClick={archive}>
            {card.archivedAt ? "Trazer de volta" : "Guardar cartão"}
          </Button>
          <Button type="button" size="touch" variant="ghost" disabled={pending} onClick={remove} className="text-foreground-secondary">
            Apagar
          </Button>
        </div>
      )}
    </form>
  );
}
