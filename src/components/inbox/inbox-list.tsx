"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { TaskWithContext } from "@/types/task";
import { setTaskStatus } from "@/lib/actions/client";
import { CompleteButton } from "@/components/tasks/complete-button";
import { taskMeta } from "@/components/tasks/task-meta";

export function InboxList({ tasks, today }: { tasks: TaskWithContext[]; today: string }) {
  const [, startTransition] = useTransition();
  const [visible, removeOptimistic] = useOptimistic(tasks, (current, id: string) =>
    current.filter((t) => t.id !== id),
  );

  function complete(task: TaskWithContext) {
    startTransition(async () => {
      removeOptimistic(task.id);
      const result = await setTaskStatus(task.id, "DONE");
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast("Concluída.", {
        action: {
          label: "Desfazer",
          onClick: () => startTransition(async () => void (await setTaskStatus(task.id, "INBOX"))),
        },
      });
    });
  }

  return (
    <ul className="divide-y divide-border">
      {visible.map((task) => (
        <li key={task.id} className="flex items-center gap-2">
          <CompleteButton title={task.title} onComplete={() => complete(task)} />
          <Link
            href={`/tarefas/${task.id}`}
            className="-mr-4 flex min-h-14 min-w-0 flex-1 items-center py-3 pr-4 transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
          >
            <span className="min-w-0">
              <span className="block truncate text-body">{task.title}</span>
              {(task.context || task.dueDate || task.estimatedMinutes) && (
                <span className="tabular block truncate text-caption text-foreground-subtle">{taskMeta(task, today)}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
