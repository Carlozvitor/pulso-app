import Link from "next/link";
import { ArrowUpRight, Briefcase, CircleDot, Dumbbell, GraduationCap, Pause, User, Wallet, type LucideIcon } from "lucide-react";
import type { ModuleKey, ProjectSummary } from "@/types/project";
import { CardFoot, CardTile } from "@/components/cards/card-parts";
import { actionsCount, projectDue, projectSince } from "@/lib/projects/labels";
import { projectMonogram } from "@/lib/projects/organize";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./progress-bar";

/** Ícone do módulo ao lado do caminho da origem. */
export const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  TRABALHO: Briefcase,
  FACULDADE: GraduationCap,
  DINHEIRO: Wallet,
  TREINO: Dumbbell,
  VIDA_PESSOAL: User,
};

/**
 * Card roxo de projeto: iniciais, origem, objetivo, progresso pelas ações, a próxima ação
 * e o prazo. Pausado mostra desde quando, sem próxima ação (as ações estão guardadas).
 * `compact` (Central): sem objetivo e sem a caixa da próxima ação.
 */
export function ProjectCard({ project, today, compact }: { project: ProjectSummary; today: string; compact?: boolean }) {
  const { done, total, percent } = project.progress;
  const paused = project.status === "PAUSED";
  const due = projectDue(project.dueDate, today);
  const ModuleIcon = project.originModule ? MODULE_ICONS[project.originModule] : null;

  return (
    <Link
      href={`/projetos/${project.id}`}
      className={cn(
        "tint tint-plum group flex min-w-0 flex-col p-4 transition-[filter] duration-(--duration-fast) hover:brightness-115 lg:p-5 lg:px-6",
        paused && "opacity-85",
      )}
    >
      <span className="flex items-start gap-3">
        <CardTile>{projectMonogram(project.name)}</CardTile>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base leading-snug font-semibold">{project.name}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-caption text-white/55">
            {ModuleIcon && <ModuleIcon aria-hidden className="size-3 shrink-0" strokeWidth={1.75} />}
            <span className="truncate">{project.origin ?? "Sem origem"}</span>
          </span>
        </span>
        {/* No celular o número fica no canto; no PC, embaixo, grande. */}
        <span className="tabular shrink-0 text-lg font-bold sm:hidden">{percent}%</span>
        <ArrowUpRight aria-hidden className="hidden size-5 shrink-0 text-plum-ink/70 sm:block" strokeWidth={1.75} />
      </span>

      {!compact && (
        <span
          className={cn(
            "mt-3.5 line-clamp-2 text-sm leading-relaxed",
            project.description ? "text-white/80" : "text-white/40 italic",
          )}
        >
          {project.description ?? "Sem objetivo ainda."}
        </span>
      )}

      <span className="mt-4 hidden items-baseline gap-2.5 sm:flex">
        <span className="tabular text-[1.625rem] leading-none font-bold tracking-tight">{percent}%</span>
        <span className="text-caption text-white/55">{actionsCount(done, total)}</span>
      </span>
      <span className="mt-3 block sm:mt-2.5">
        <ProgressBar percent={percent} label={`Progresso de ${project.name}: ${actionsCount(done, total)}`} />
      </span>

      {!compact &&
        (paused ? (
          <span className="mt-3.5 flex items-center gap-2.5 rounded-lg bg-black/25 px-3 py-2.5 text-sm text-amber-ink">
            <Pause aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {projectSince(project)}
          </span>
        ) : (
          <span className="mt-3.5 flex min-w-0 items-center gap-2.5 rounded-lg bg-black/25 px-3 py-2">
            <CircleDot aria-hidden className="size-4 shrink-0 text-teal-ink" strokeWidth={1.75} />
            <span className="min-w-0">
              <span className="block text-[0.6875rem] font-semibold tracking-[0.08em] text-white/45 uppercase">Próxima ação</span>
              <span className={cn("block truncate text-sm", project.next ? "font-medium" : "text-white/50")}>
                {project.next?.title ?? "Nenhuma ação aberta"}
              </span>
            </span>
          </span>
        ))}

      <CardFoot
        left={due.label}
        right={paused || !due.note ? undefined : <span className={cn(due.soon && "text-amber-ink")}>{due.note}</span>}
        stack={compact}
      />
    </Link>
  );
}
