import Link from "next/link";
import type { ProjectSummary } from "@/types/project";
import { actionsCount, projectSince } from "@/lib/projects/labels";
import { projectMonogram } from "@/lib/projects/organize";

/** Linha de projeto concluído ou arquivado: iniciais, nome, quando acabou e quantas ações. */
export function ProjectRow({ project }: { project: ProjectSummary }) {
  const { done, total } = project.progress;
  return (
    <Link
      href={`/projetos/${project.id}`}
      className="-mx-4 flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-plum-tile/60 text-xs font-semibold tracking-wide text-plum-ink"
      >
        {projectMonogram(project.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-foreground">{project.name}</span>
        <span className="block truncate text-caption text-foreground-subtle">
          {[project.origin ?? "Sem origem", actionsCount(done, total)].join(" · ")}
        </span>
      </span>
      <span className="tabular shrink-0 text-caption text-foreground-subtle">{projectSince(project)}</span>
    </Link>
  );
}
