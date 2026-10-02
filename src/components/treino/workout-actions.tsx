"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmSheet } from "@/components/feedback/confirm-sheet";
import { deleteWorkout, finishWorkout, setWorkoutDate } from "@/lib/actions/client";
import { cn } from "@/lib/utils";
import { limeButton } from "./styles";

/** "Concluir treino": guarda só os marcados e volta para o Treino. `full`: o botão grande do celular. */
export function FinishButton({ sessionId, full }: { sessionId: string; full?: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function finish() {
    startTransition(async () => {
      const result = await finishWorkout(sessionId);
      if (!result.ok) return void toast.error(result.error);
      toast("Treino concluído.");
      router.push("/treino");
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={finish}
      className={cn(limeButton, full && "h-12 w-full rounded-md text-body lg:hidden")}
    >
      {pending ? <LoaderCircle aria-hidden className="animate-spin" strokeWidth={2} /> : <Check aria-hidden strokeWidth={2.25} />}
      Concluir treino
    </button>
  );
}

/** Dia do treino: registrou depois, passou da meia-noite… Não vai além de hoje. */
export function WorkoutDateField({ sessionId, date, today }: { sessionId: string; date: string; today: string }) {
  const [value, setValue] = useState(date);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setWorkoutDate(sessionId, next);
      if (!result.ok) {
        setValue(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <label className="relative block">
      <span className="sr-only">Dia do treino</span>
      <Calendar aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-subtle" strokeWidth={1.75} />
      <input
        type="date"
        value={value}
        max={today}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className="h-11 w-full rounded-md border border-border bg-surface pr-3 pl-9 text-sm text-foreground focus-visible:border-primary-soft focus-visible:outline-none [color-scheme:dark]"
      />
    </label>
  );
}

/** Descartar (em andamento) ou apagar (concluído) o treino, com confirmação. */
export function DiscardButton({ sessionId, finished }: { sessionId: string; finished: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    startTransition(async () => {
      const result = await deleteWorkout(sessionId);
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      toast(finished ? "Treino apagado." : "Treino descartado.");
      router.push("/treino");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 self-start text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground"
      >
        <Trash2 aria-hidden className="size-3.5" strokeWidth={1.75} />
        {finished ? "Apagar este treino" : "Descartar este treino"}
      </button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title={finished ? "Apagar este treino?" : "Descartar este treino?"}
        description={
          finished
            ? "Ele sai do histórico, da frequência e da evolução dos exercícios. Os exercícios continuam no catálogo."
            : "O que foi anotado aqui some. Os exercícios continuam no catálogo."
        }
        confirmLabel={finished ? "Apagar treino" : "Descartar treino"}
        onConfirm={remove}
        pending={pending}
      />
    </>
  );
}
