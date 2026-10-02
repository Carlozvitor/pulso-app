"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LoaderCircle, Plus, Repeat, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { startWorkout } from "@/lib/actions/client";
import type { StartInput } from "@/lib/treino/schemas";
import { exercisesLabel } from "@/lib/treino/format";
import { WEEKDAYS_SHORT, pastDayTitle, shortDate, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { limeButton } from "./styles";

/** Começa o treino e abre a tela dele. Já existe um em andamento: abre esse. */
function useStart() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const start = (input: StartInput) =>
    startTransition(async () => {
      const result = await startWorkout(input);
      if (!result.ok) return void toast.error(result.error);
      router.push(`/treino/fazer/${result.id}`);
    });
  return { pending, start };
}

/**
 * Botão de começar treino. `main`: o grande, lima, do card de hoje · `alt`: o de moldura ao
 * lado · `header`: o do cabeçalho da tela.
 */
export function StartButton({
  input,
  label,
  hint,
  variant,
  icon: Icon = Plus,
}: {
  input: StartInput;
  label: string;
  hint?: string;
  variant: "main" | "alt" | "header";
  icon?: LucideIcon;
}) {
  const { pending, start } = useStart();
  const icon = pending ? <LoaderCircle aria-hidden className="animate-spin" strokeWidth={2} /> : <Icon aria-hidden strokeWidth={2} />;

  if (variant === "header") {
    return (
      <button type="button" disabled={pending} onClick={() => start(input)} className={limeButton}>
        {icon}
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(input)}
      className={cn(
        "grid min-h-16 min-w-0 content-start gap-1 rounded-[10px] px-4 py-3.5 text-left transition-[filter] duration-(--duration-fast) hover:brightness-110 disabled:opacity-70 [&_svg]:size-[1.0625rem]",
        variant === "main" ? "bg-lime-ink text-[#141a04]" : "bg-black/30 shadow-[inset_0_0_0_1px_rgb(190_242_100/0.22)] [&_svg]:text-lime-ink",
      )}
    >
      <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
        {icon}
        {label}
      </span>
      {hint && <span className={cn("text-caption", variant === "main" ? "text-[#141a04]/70" : "text-white/60")}>{hint}</span>}
    </button>
  );
}

/** Botão redondo ao lado de uma ficha: começa o treino por ela. */
export function StartIconButton({ planId, label, icon: Icon }: { planId: string; label: string; icon: LucideIcon }) {
  const { pending, start } = useStart();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => start({ from: "plan", planId })}
      className="mr-1 grid size-11 shrink-0 place-items-center rounded-full text-lime-ink transition-colors duration-(--duration-fast) hover:bg-lime-ink/10 disabled:opacity-60"
    >
      {pending ? <LoaderCircle aria-hidden className="size-[1.125rem] animate-spin" strokeWidth={2} /> : <Icon aria-hidden className="size-[1.125rem]" strokeWidth={2} />}
    </button>
  );
}

/** Um treino feito, na escolha de "Repetir um treino". */
export type RepeatChoice = { id: string; date: string; title: string; names: string; done: number };

/** "Repetir um treino": escolhe um dos últimos e ele vem com os mesmos exercícios, já preenchidos. */
export function RepeatButton({ choices, today, variant = "alt" }: { choices: RepeatChoice[]; today: string; variant?: "alt" | "link" }) {
  const [open, setOpen] = useState(false);
  const { pending, start } = useStart();

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 text-caption text-white/60 transition-colors duration-(--duration-fast) hover:text-white"
        >
          <Repeat aria-hidden className="size-3.5" strokeWidth={1.75} />
          Repetir um treino
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid min-h-16 min-w-0 content-start gap-1 rounded-[10px] bg-black/30 px-4 py-3.5 text-left shadow-[inset_0_0_0_1px_rgb(190_242_100/0.22)] transition-[filter] duration-(--duration-fast) hover:brightness-110"
        >
          <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
            <Repeat aria-hidden className="size-[1.0625rem] text-lime-ink" strokeWidth={2} />
            Repetir um treino
          </span>
          <span className="text-caption text-white/60">Escolha um dos últimos e ele vem preenchido.</span>
        </button>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <div className="flex max-h-[80dvh] flex-col px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
            <DrawerTitle className="mt-4 text-left text-title font-semibold">Repetir um treino</DrawerTitle>
            <DrawerDescription className="mt-0.5 text-left text-caption text-foreground-subtle">
              Os mesmos exercícios, com os números da última vez de cada um.
            </DrawerDescription>
            <ul className="-mx-1 mt-4 grid gap-1 overflow-y-auto">
              {choices.map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start({ from: "session", sessionId: choice.id })}
                    className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-(--duration-fast) hover:bg-white/5 disabled:opacity-60"
                  >
                    <span className="w-10 shrink-0 text-center leading-tight">
                      <span className="block text-[0.625rem] font-semibold tracking-[0.08em] text-foreground-subtle uppercase">
                        {WEEKDAYS_SHORT[weekday(choice.date)]}
                      </span>
                      <span className="tabular block text-lg font-semibold">{Number(choice.date.slice(8))}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{choice.title}</span>
                      <span className="block truncate text-caption text-foreground-subtle">
                        {[choice.names, exercisesLabel(choice.done), dayOrDate(choice.date, today)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-ui" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function dayOrDate(date: string, today: string): string {
  const title = pastDayTitle(date, today);
  return title === "Hoje" || title === "Ontem" ? title.toLocaleLowerCase("pt-BR") : shortDate(date);
}
