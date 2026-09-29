"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ActiveSession as Session } from "@/types/session";
import type { TaskStatus } from "@/types/task";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/agora/section-label";
import { CompleteButton } from "@/components/tasks/complete-button";
import { taskMeta } from "@/components/tasks/task-meta";
import { endSession } from "@/lib/sessions/actions";
import { setTaskStatus } from "@/lib/tasks/actions";
import { timeLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Sem cronômetro: só a hora prevista de término e as tarefas para marcar. */
export function ActiveSession({ session, today }: { session: Session; today: string }) {
  const [pending, startTransition] = useTransition();
  const [tasks, setOptimistic] = useOptimistic(
    session.tasks,
    (current, change: { id: string; status: TaskStatus }) =>
      current.map((t) => (t.id === change.id ? { ...t, status: change.status } : t)),
  );
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "DONE");

  function toggle(id: string, from: TaskStatus) {
    // Desmarcar volta ao status que ela tinha ao abrir a sessão (ex.: em andamento).
    const original = session.tasks.find((t) => t.id === id)?.status;
    const reopened: TaskStatus = original && original !== "DONE" ? original : "TODO";
    const to: TaskStatus = from === "DONE" ? reopened : "DONE";
    startTransition(async () => {
      setOptimistic({ id, status: to });
      const result = await setTaskStatus(id, to);
      if (!result.ok) toast.error(result.error);
    });
  }

  function end() {
    startTransition(async () => {
      const result = await endSession(session.id);
      if (!result.ok) return void toast.error(result.error);
      toast("Sessão encerrada.");
    });
  }

  return (
    <div className="flex flex-col">
      <SectionLabel accent>Sessão em andamento</SectionLabel>
      <p className="tabular mt-1 text-sm text-foreground-secondary">
        Termina por volta de {timeLabel(new Date(session.endsAt))}
      </p>

      {tasks.length > 0 ? (
        <ol className="mt-4 divide-y divide-border">
          {tasks.map((task) => {
            const done = task.status === "DONE";
            const meta = taskMeta(task, today);
            return (
              <li key={task.id} className="flex items-center gap-2">
                <CompleteButton title={task.title} done={done} onComplete={() => toggle(task.id, task.status)} />
                <Link
                  href={`/tarefas/${task.id}`}
                  className="-mr-4 flex min-h-14 min-w-0 flex-1 items-center py-3 pr-4 transition-colors duration-(--duration-fast) active:bg-surface"
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-body",
                        done && "text-foreground-subtle line-through decoration-muted-ui",
                      )}
                    >
                      {task.title}
                    </span>
                    {meta && <span className="tabular block truncate text-caption text-foreground-subtle">{meta}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-foreground-subtle">As tarefas desta sessão saíram da lista.</p>
      )}

      {allDone && <p className="mt-6 text-body font-medium">Tudo feito nesta sessão.</p>}

      <Button
        variant={allDone ? "default" : "secondary"}
        size="touch"
        disabled={pending}
        onClick={end}
        className="mt-8 w-full"
      >
        Encerrar sessão
      </Button>
    </div>
  );
}
