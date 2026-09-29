import Link from "next/link";
import type { ProjectSummary } from "@/types/project";
import { dueLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./progress-bar";

/** "Era pra 3 out · 3 de 8" — prazo e contagem, sem cor de alerta. */
function projectMeta(project: ProjectSummary, today: string): string {
  const { done, total } = project.progress;
  return [
    project.dueDate ? dueLabel(project.dueDate, today) : null,
    total === 0 ? "Sem tarefas" : `${done} de ${total}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ProjectRow({ project, today, quiet }: { project: ProjectSummary; today: string; quiet?: boolean }) {
  return (
    <Link
      href={`/projetos/${project.id}`}
      className="-mx-4 flex min-h-16 flex-col justify-center gap-2 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
    >
      <span className="flex items-baseline justify-between gap-4">
        <span className={cn("truncate text-body", quiet ? "text-foreground-secondary" : "text-foreground")}>
          {project.name}
        </span>
        <span className="tabular shrink-0 text-caption text-foreground-subtle">{projectMeta(project, today)}</span>
      </span>
      {!quiet && project.progress.total > 0 && (
        <ProgressBar progress={project.progress} label={`Progresso de ${project.name}`} />
      )}
    </Link>
  );
}
