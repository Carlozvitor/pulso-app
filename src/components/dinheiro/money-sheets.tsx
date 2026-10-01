"use client";

import { createContext, useContext, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { billKey, plannedKey, type LinkedTask } from "@/lib/dinheiro/keys";
import { billState } from "@/lib/dinheiro/summary";
import type { MoneyBill, MoneyCard, MoneyEntry, MonthKey } from "@/types/money";
import { BillForm } from "./bill-form";
import { CardForm } from "./card-form";
import { EntryForm } from "./entry-form";

/** O que abrir: gasto/entrada/pagamento futuro, conta fixa ou cartão — novo ou existente. */
export type SheetTarget =
  | { type: "entry"; mode: "new"; kind: "IN" | "OUT"; planned?: boolean; cardId?: string | null }
  | { type: "entry"; mode: "edit"; id: string }
  | { type: "bill"; mode: "new" }
  | { type: "bill"; mode: "edit"; id: string; month: MonthKey }
  | { type: "card"; mode: "new" }
  | { type: "card"; mode: "edit"; id: string };

const SheetContext = createContext<((target: SheetTarget) => void) | null>(null);

export function useMoneySheet(): (target: SheetTarget) => void {
  const open = useContext(SheetContext);
  if (!open) throw new Error("useMoneySheet precisa de <MoneySheetProvider>.");
  return open;
}

/** Parâmetros do endereço que abrem uma gaveta na chegada (links da Central e das tarefas). */
export const SHEET_PARAMS = ["conta", "lancamento", "cartao"] as const;

/**
 * Guarda as gavetas do Dinheiro: linhas e botões só pedem para abrir. `initial` (vindo do
 * endereço: ?conta=…&mes=…, ?lancamento=…) abre já na chegada; fechar limpa o endereço.
 */
export function MoneySheetProvider({
  cards,
  activeCards,
  bills,
  entries,
  billHistory = {},
  linked,
  today,
  initial,
  children,
}: {
  /** Todos (a compra de um cartão guardado continua abrindo). */
  cards: MoneyCard[];
  activeCards: MoneyCard[];
  bills: MoneyBill[];
  entries: MoneyEntry[];
  billHistory?: Record<string, MoneyEntry[]>;
  linked: Record<string, LinkedTask>;
  today: string;
  initial?: SheetTarget | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [target, setTarget] = useState<SheetTarget | null>(initial ?? null);
  // Muda a cada abertura: o formulário nasce de novo com os valores certos.
  const [key, setKey] = useState(0);

  function open(next: SheetTarget) {
    setTarget(next);
    setKey((k) => k + 1);
  }

  function close() {
    setTarget(null);
    if (SHEET_PARAMS.some((p) => params.has(p))) {
      const rest = new URLSearchParams(params);
      for (const p of [...SHEET_PARAMS, "mes-conta"]) rest.delete(p);
      const query = rest.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }

  const entry = target?.type === "entry" && target.mode === "edit" ? entries.find((e) => e.id === target.id) : undefined;
  const bill = target?.type === "bill" && target.mode === "edit" ? bills.find((b) => b.id === target.id) : undefined;
  const card = target?.type === "card" && target.mode === "edit" ? cards.find((c) => c.id === target.id) : undefined;
  const missing = target !== null && target.mode === "edit" && !entry && !bill && !card;

  // A compra num cartão guardado mostra o cartão dela entre as opções.
  const entryCards = entry?.cardId && !activeCards.some((c) => c.id === entry.cardId) ? [...activeCards, ...cards.filter((c) => c.id === entry.cardId)] : activeCards;

  return (
    <SheetContext.Provider value={open}>
      {children}
      <Drawer open={target !== null && !missing} onOpenChange={(isOpen) => !isOpen && close()}>
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerContent className="bottom-(--drawer-keyboard-inset,0px) mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
            {target?.type === "entry" && target.mode === "new" && (
              <EntryForm key={key} target={target} cards={activeCards} today={today} linked={null} onDone={close} />
            )}
            {entry && (
              <EntryForm
                key={key}
                target={{ mode: "edit", entry }}
                cards={entryCards}
                today={today}
                linked={linked[plannedKey(entry.id)] ?? null}
                onDone={close}
              />
            )}
            {target?.type === "bill" && target.mode === "new" && (
              <BillForm key={key} target={{ mode: "new" }} cards={activeCards} history={[]} today={today} linked={null} onDone={close} />
            )}
            {bill && target?.type === "bill" && target.mode === "edit" && (
              <BillForm
                key={key}
                target={{ mode: "edit", bill, month: target.month, state: billState(bill, target.month, entries) }}
                cards={activeCards}
                history={billHistory[bill.id] ?? []}
                today={today}
                linked={linked[billKey(bill.id, target.month)] ?? null}
                onDone={close}
              />
            )}
            {target?.type === "card" && (target.mode === "new" || card) && <CardForm key={key} card={card ?? null} onDone={close} />}
          </DrawerContent>
        </DrawerPrimitive.VirtualKeyboardProvider>
      </Drawer>
    </SheetContext.Provider>
  );
}

/** Botão que só abre uma gaveta (para usar dentro de páginas do servidor). */
export function SheetButton({ target, className, children, ...rest }: { target: SheetTarget; className?: string; children: React.ReactNode } & Omit<React.ComponentProps<"button">, "onClick" | "type">) {
  const open = useMoneySheet();
  return (
    <button type="button" onClick={() => open(target)} className={className} {...rest}>
      {children}
    </button>
  );
}
