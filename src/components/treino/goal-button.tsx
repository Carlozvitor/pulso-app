"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { setWeeklyGoal } from "@/lib/actions/client";
import { limeChip } from "./styles";

/** "Meta: 4 por semana" — escolhe quantos treinos por semana (ou sem meta). */
export function GoalButton({ goal }: { goal: number | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(value: number | null) {
    startTransition(async () => {
      const result = await setWeeklyGoal(value);
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground"
      >
        {goal ? `Meta: ${goal} por semana` : "Definir meta"}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <div className="flex flex-col px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
            <DrawerTitle className="mt-4 text-left text-title font-semibold">Treinos por semana</DrawerTitle>
            <DrawerDescription className="mt-0.5 text-left text-caption text-foreground-subtle">
              A semana vai de segunda a domingo. Conta o dia em que você registrou um treino.
            </DrawerDescription>
            <div role="group" aria-label="Treinos por semana" className="mt-5 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" disabled={pending} aria-pressed={goal === n} onClick={() => choose(n)} className={`${limeChip(goal === n)} w-14 px-0`}>
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={pending}
              aria-pressed={goal === null}
              onClick={() => choose(null)}
              className={`${limeChip(goal === null)} mt-3 self-start`}
            >
              Sem meta
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
