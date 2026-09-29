"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { TaskSummary } from "@/types/task";
import { SectionLabel } from "@/components/agora/section-label";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { TaskItem } from "@/components/tasks/task-item";
import { createProjectTask } from "@/lib/actions/client";

type ProjectTasksProps = {
  projectId: string;
  /** Abertas, já na ordem de prioridade. */
  tasks: TaskSummary[];
  today: string;
  /** Projeto concluído/arquivado não recebe tarefa nova. */
  canAdd: boolean;
};

export function ProjectTasks({ projectId, tasks, today, canAdd }: ProjectTasksProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  // Aparece na lista no toque; some sozinha se o servidor recusar.
  const [adding, addOptimistic] = useOptimistic<string[], string>([], (current, title) => [...current, title]);

  function add(title: string) {
    startTransition(async () => {
      addOptimistic(title);
      const result = await createProjectTask(projectId, title);
      if (!result.ok) {
        toast.error(result.error, { action: { label: "Tentar de novo", onClick: () => add(title) } });
      }
    });
  }

  const hasTasks = tasks.length > 0 || adding.length > 0;

  return (
    <section aria-labelledby="project-tasks-label" className="mt-8">
      <SectionLabel id="project-tasks-label">Tarefas abertas</SectionLabel>
      {hasTasks ? (
        <ul className="mt-2 divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskItem task={task} today={today} />
            </li>
          ))}
          {adding.map((title, i) => (
            <li key={`adding-${i}`} className="flex min-h-14 items-center py-3">
              <p className="truncate text-body text-foreground-secondary">{title}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-foreground-subtle">Nenhuma tarefa aberta neste projeto.</p>
      )}

      {canAdd && (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-mx-4 mt-1 flex min-h-12 w-[calc(100%+2rem)] items-center gap-3 px-4 text-left text-body text-foreground-secondary transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
          >
            <Plus aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
            Adicionar tarefa
          </button>
          <QuickCapture open={open} onOpenChange={setOpen} onCapture={add} />
        </>
      )}
    </section>
  );
}
