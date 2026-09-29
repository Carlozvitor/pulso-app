"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Check, Moon, Pause, Play, Target } from "lucide-react";
import { toast } from "sonner";
import type { AgoraView } from "@/types/task";
import { CardFoot, CardTile } from "@/components/cards/card-parts";
import { pauseTask, setTaskStatus, snoozeTask } from "@/lib/actions/client";
import { dueLabel } from "@/lib/dates";
import { ENERGY_LABEL } from "@/lib/tasks/levels";
import { formatDuration } from "@/lib/tasks/format";
import { cn } from "@/lib/utils";

/** Estado do card: muda na hora do toque; o servidor confirma depois. */
type CardState = "todo" | "paused" | "doing" | "done" | "snoozed";

const LABEL: Record<CardState, string> = {
  todo: "Agora",
  paused: "Pausada",
  doing: "Em andamento",
  done: "Concluída",
  snoozed: "Volta amanhã",
};

const primaryClass =
  "inline-flex h-11 items-center gap-2 rounded-[9px] bg-teal-ink px-5 font-semibold text-[#042f2e] transition-[filter,transform] duration-(--duration-fast) hover:brightness-110 active:scale-[0.98] disabled:opacity-70";
const secondaryClass =
  "inline-flex h-11 items-center gap-2 rounded-[9px] border border-white/12 bg-white/6 px-4 font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-white/10 disabled:opacity-70";

/**
 * A próxima ação — o card em destaque da Agora.
 * A fazer: Começar · Agora não. Pausada: Retomar · Agora não. Em andamento: Concluir · Pausar.
 */
export function NowCard({ task, today }: { task: NonNullable<AgoraView["now"]>; today: string }) {
  const [pending, startTransition] = useTransition();
  const initial: CardState = task.status === "IN_PROGRESS" ? "doing" : task.paused ? "paused" : "todo";
  const [state, setState] = useOptimistic<CardState>(initial);
  const meta = [task.context, task.dueDate ? dueLabel(task.dueDate, today) : null].filter(Boolean).join(" · ");
  const settled = state === "done" || state === "snoozed";

  function run(next: CardState, action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    startTransition(async () => {
      setState(next);
      const result = await action();
      if (!result.ok) return void toast.error(result.error ?? "Não deu para salvar agora.");
      onDone?.();
    });
  }

  const start = () => run("doing", () => setTaskStatus(task.id, "IN_PROGRESS"));

  const complete = () =>
    run("done", () => setTaskStatus(task.id, "DONE"), () =>
      toast("Concluída. A próxima já está aqui.", {
        action: { label: "Desfazer", onClick: () => run("doing", () => setTaskStatus(task.id, "IN_PROGRESS")) },
      }),
    );

  const pause = () =>
    run("paused", () => pauseTask(task.id), () =>
      toast("Pausada. Fica em A fazer até você retomar.", {
        action: { label: "Desfazer", onClick: () => run("doing", () => setTaskStatus(task.id, "IN_PROGRESS")) },
      }),
    );

  const notNow = () =>
    run("snoozed", () => snoozeTask(task.id), () =>
      toast("Guardada em A fazer. Volta para a Agora amanhã.", {
        action: { label: "Desfazer", onClick: () => run(initial, () => snoozeTask(task.id, false)) },
      }),
    );

  return (
    <article aria-labelledby="agora-titulo" className="tint tint-teal flex flex-col p-5 sm:col-span-2 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <CardTile icon={Target} />
        <span className="text-caption font-semibold tracking-[0.1em] text-teal-ink uppercase">{LABEL[state]}</span>
      </div>

      {meta && <p className="mt-5 truncate text-sm text-white/75">{meta}</p>}
      <p
        id="agora-titulo"
        className={cn(
          "mt-1 text-[1.5rem] leading-tight font-semibold tracking-tight text-balance transition-colors duration-(--duration-base) lg:text-[1.75rem]",
          !meta && "mt-5",
          state === "done" && "text-white/50 line-through decoration-white/30",
          state === "snoozed" && "text-white/50",
        )}
      >
        {task.title}
      </p>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {state === "doing" || state === "done" ? (
          <>
            <button type="button" onClick={complete} disabled={pending || settled} className={primaryClass}>
              <Check aria-hidden className="size-4" strokeWidth={2.5} />
              {state === "done" ? "Concluída" : "Concluir"}
            </button>
            <button type="button" onClick={pause} disabled={pending || settled} className={secondaryClass}>
              <Pause aria-hidden className="size-4" strokeWidth={2} />
              Pausar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={start} disabled={pending || settled} className={primaryClass}>
              <Play aria-hidden className="size-4" strokeWidth={2.25} />
              {state === "paused" ? "Retomar" : "Começar"}
            </button>
            <button type="button" onClick={notNow} disabled={pending || settled} className={secondaryClass}>
              <Moon aria-hidden className="size-4" strokeWidth={2} />
              Agora não
            </button>
          </>
        )}
        <Link href={`/tarefas/${task.id}`} className={secondaryClass}>
          Detalhes
        </Link>
      </div>

      <CardFoot
        left={task.energy ? `Energia ${ENERGY_LABEL[task.energy].toLowerCase()}` : "A próxima ação"}
        right={task.estimatedMinutes != null ? formatDuration(task.estimatedMinutes) : undefined}
      />
    </article>
  );
}
