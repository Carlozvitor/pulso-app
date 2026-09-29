import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { ProjectSummary } from "@/types/project";
import { CardFoot, CardTile, ProgressRing } from "@/components/cards/card-parts";
import { daysBetween, dueLabel } from "@/lib/dates";
import { projectMonogram } from "@/lib/projects/organize";
import { cn } from "@/lib/utils";

/** "prazo 15 out" · "prazo hoje" · "era pra 3 out" — sem cor de alerta. */
function dueNote(dueDate: string | null, today: string): string {
  if (!dueDate) return "sem prazo";
  const label = dueLabel(dueDate, today).toLowerCase();
  return daysBetween(today, dueDate) < 0 ? label : `prazo ${label}`;
}

/** Card roxo de projeto: iniciais, anel e % de progresso, tarefas e prazo. */
export function ProjectCard({ project, today, compact }: { project: ProjectSummary; today: string; compact?: boolean }) {
  const { done, total, percent } = project.progress;
  const finished = total > 0 && done === total;
  return (
    <Link
      href={`/projetos/${project.id}`}
      className={cn(
        "tint tint-plum group flex flex-col transition-[filter] duration-(--duration-fast) hover:brightness-115",
        compact ? "min-h-40 p-4 lg:min-h-48 lg:p-5 lg:px-6" : "min-h-44 p-5 lg:min-h-52 lg:px-6",
      )}
    >
      <span className="flex items-start justify-between">
        <CardTile>{projectMonogram(project.name)}</CardTile>
        <ProgressRing percent={percent} label={`${percent}% concluído`}>
          {finished ? (
            <Check aria-hidden className="size-4" strokeWidth={2.5} />
          ) : (
            <ArrowUpRight aria-hidden className="size-4" strokeWidth={2.25} />
          )}
        </ProgressRing>
      </span>
      <span className="mt-5 block truncate text-sm text-white/80">{project.name}</span>
      {total > 0 ? (
        <span className="tabular text-[1.75rem] leading-tight font-bold tracking-tight lg:text-[1.875rem]">{percent}%</span>
      ) : (
        <span className="text-lg leading-tight font-semibold text-white/60 lg:mt-1">Sem tarefas</span>
      )}
      <CardFoot
        left={total > 0 ? `${done} de ${total} tarefas` : "Nada ainda"}
        right={dueNote(project.dueDate, today)}
        highlight={Boolean(project.dueDate) && daysBetween(today, project.dueDate!) >= 0}
        stack={compact}
      />
    </Link>
  );
}
