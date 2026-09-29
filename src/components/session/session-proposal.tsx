"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SessionProposal as Proposal } from "@/types/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { SectionLabel } from "@/components/agora/section-label";
import { taskMeta } from "@/components/tasks/task-meta";
import { startSession } from "@/lib/sessions/actions";
import { SESSION_ENERGY_LABEL, proposalHref } from "@/lib/sessions/schemas";
import { formatDuration } from "@/lib/tasks/format";

/** A sessão montada — dá para tirar uma tarefa ("Agora não") antes de começar. */
export function SessionProposal({ proposal, today }: { proposal: Proposal; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { minutes, energy, tasks, plannedMinutes, skipped } = proposal;

  function start() {
    startTransition(async () => {
      const result = await startSession({ minutes, energy, taskIds: tasks.map((t) => t.id) });
      if (!result.ok) return void toast.error(result.error);
      router.replace("/sessao");
    });
  }

  const choice = `${formatDuration(minutes)} · energia ${SESSION_ENERGY_LABEL[energy].toLowerCase()}`;

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-body font-medium">Nada cabe nessa sessão.</p>
          <p className="mt-1 text-sm text-foreground-subtle">
            {skipped.length > 0
              ? "Você tirou as que cabiam. Dá para recomeçar ou mudar o tempo."
              : "Tente com mais tempo ou outra energia."}
          </p>
        </div>
        {skipped.length > 0 && (
          <Link
            href={proposalHref({ minutes, energy })}
            replace
            className={buttonVariants({ variant: "secondary", size: "touch", className: "w-full" })}
          >
            Recomeçar
          </Link>
        )}
        <ChangeChoiceLink minutes={minutes} energy={energy} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <SectionLabel accent>Sua sessão</SectionLabel>
        <p className="tabular text-caption text-foreground-subtle">
          {formatDuration(plannedMinutes)} de {formatDuration(minutes)}
        </p>
      </div>
      <p className="mt-1 text-sm text-foreground-subtle">{choice}</p>

      <ol className="mt-4 divide-y divide-border">
        {tasks.map((task) => {
          // Sem duração conta como ~15 min — mostrar isso deixa a soma honesta.
          const meta = [taskMeta(task, today), task.estimatedMinutes == null ? "~15 min" : null]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={task.id} className="flex min-h-14 items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body">{task.title}</p>
                <p className="tabular truncate text-caption text-foreground-subtle">{meta}</p>
              </div>
              <Link
                href={proposalHref({ minutes, energy }, [...skipped, task.id])}
                replace
                scroll={false}
                className="-mr-2 inline-flex min-h-11 shrink-0 items-center px-2 text-caption text-foreground-subtle active:text-foreground"
                aria-label={`Agora não: ${task.title}`}
              >
                Agora não
              </Link>
            </li>
          );
        })}
      </ol>

      <Button size="touch" disabled={pending} onClick={start} className="mt-6 w-full">
        Começar
      </Button>
      <ChangeChoiceLink minutes={minutes} energy={energy} />
    </div>
  );
}

function ChangeChoiceLink(choice: { minutes: number; energy: Proposal["energy"] }) {
  return (
    <Link
      href={`${proposalHref(choice)}&escolher=1`}
      className="mx-auto mt-2 inline-flex min-h-11 items-center px-3 text-sm text-foreground-subtle active:text-foreground"
    >
      Mudar tempo ou energia
    </Link>
  );
}
