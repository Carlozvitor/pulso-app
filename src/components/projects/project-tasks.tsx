"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { TaskSummary } from "@/types/task";
import { SectionLabel } from "@/components/agora/section-label";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { TaskItem } from "@/components/tasks/task-item";
import { createProjectTask } from "@/lib/projects/actions";

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

  function add(title: string) {
    startTransition(async () => {
      const result = await createProjectTask(projectId, title);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <section aria-labelledby="project-tasks-label" className="mt-8">
      <SectionLabel id="project-tasks-label">Tarefas abertas</SectionLabel>
      {tasks.length > 0 ? (
        <ul className="mt-2 divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskItem task={task} today={today} />
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
            className="-mx-4 mt-1 flex min-h-12 w-[calc(100%+2rem)] items-center gap-3 px-4 text-left text-body text-foreground-secondary transition-colors duration-(--duration-fast) active:bg-surface"
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
