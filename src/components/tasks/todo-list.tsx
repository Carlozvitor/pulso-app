"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { TaskSummary } from "@/types/task";
import { pauseTask, setTaskStatus, snoozeTask } from "@/lib/actions/client";
import { dayTitle } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CompleteButton } from "./complete-button";
import { taskMeta } from "./task-meta";

export type TodoSection = "inProgress" | "paused" | "todo" | "later";

/** Desfazer a conclusão devolve a tarefa ao bloco de onde ela saiu. */
async function restore(id: string, section: TodoSection) {
  if (section === "inProgress") return setTaskStatus(id, "IN_PROGRESS");
  if (section === "paused") return pauseTask(id);
  const reopened = await setTaskStatus(id, "TODO");
  // Concluir tira o "Agora não"; desfazer devolve.
  return reopened.ok && section === "later" ? snoozeTask(id) : reopened;
}

type Row = TaskSummary & { snoozedUntil?: string };

/** Lista de A fazer: o círculo conclui (com Desfazer), o toque na linha abre o detalhe. */
export function TodoList({ tasks, today, section }: { tasks: Row[]; today: string; section: TodoSection }) {
  const [, startTransition] = useTransition();
  const [visible, removeOptimistic] = useOptimistic(tasks, (current, id: string) => current.filter((t) => t.id !== id));

  function complete(task: Row) {
    startTransition(async () => {
      removeOptimistic(task.id);
      const result = await setTaskStatus(task.id, "DONE");
      if (!result.ok) return void toast.error(result.error);
      toast("Concluída.", {
        action: {
          label: "Desfazer",
          onClick: () =>
            startTransition(async () => {
              const undone = await restore(task.id, section);
              if (!undone.ok) toast.error(undone.error);
            }),
        },
      });
    });
  }

  return (
    <ul className="divide-y divide-border">
      {visible.map((task) => {
        const back = task.snoozedUntil ? `volta ${dayTitle(task.snoozedUntil, today).toLowerCase()}` : null;
        const meta = [taskMeta(task, today) || null, back].filter(Boolean).join(" · ");
        return (
          <li key={task.id} className="flex items-center gap-2">
            <CompleteButton title={task.title} onComplete={() => complete(task)} />
            <Link
              href={`/tarefas/${task.id}`}
              className="-mr-4 flex min-h-14 min-w-0 flex-1 items-center py-3 pr-4 transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
            >
              <span className="min-w-0">
                <span className={cn("block truncate text-body", section === "later" && "text-foreground-secondary")}>
                  {task.title}
                </span>
                {meta && <span className="tabular block truncate text-caption text-foreground-subtle">{meta}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
