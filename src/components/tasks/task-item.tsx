import Link from "next/link";
import type { TaskSummary } from "@/types/task";
import { cn } from "@/lib/utils";
import { DurationBadge } from "./duration-badge";

type TaskItemProps = {
  task: TaskSummary;
  /** Itens de "mais tarde" ficam um tom abaixo. */
  quiet?: boolean;
};

/** Linha de tarefa: toque abre o detalhe. Sem card — só hierarquia de texto. */
export function TaskItem({ task, quiet }: TaskItemProps) {
  return (
    <Link
      href={`/tarefas/${task.id}`}
      className="-mx-4 flex min-h-14 items-center gap-4 px-4 py-3 transition-colors duration-(--duration-fast) active:bg-surface"
    >
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-body", quiet ? "text-foreground-secondary" : "text-foreground")}>
          {task.title}
        </p>
        {task.context && <p className="truncate text-caption text-foreground-subtle">{task.context}</p>}
      </div>
      <DurationBadge minutes={task.estimatedMinutes} className="shrink-0" />
    </Link>
  );
}
