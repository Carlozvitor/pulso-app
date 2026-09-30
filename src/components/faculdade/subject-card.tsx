import Link from "next/link";
import { ArrowUpRight, Award, CalendarClock } from "lucide-react";
import { CardTile } from "@/components/cards/card-parts";
import type { SubjectSummary } from "@/lib/faculdade/summary";
import { dueLabel } from "@/lib/dates";
import { gradeLabel } from "@/lib/faculdade/assessments";
import { originHref } from "@/lib/origins/tree";
import { projectMonogram } from "@/lib/projects/organize";
import { cn } from "@/lib/utils";

function count(n: number, one: string, many: string, none: string): string {
  if (n === 0) return none;
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

/** Card rosa de uma disciplina: horário das aulas, notas lançadas e a próxima avaliação. */
export function SubjectCard({ subject, today }: { subject: SubjectSummary; today: string }) {
  const href = originHref(subject.node) ?? "/faculdade";
  const next = subject.pending[0] ?? null;
  const grades = subject.grades.map((a) => `${a.title} ${gradeLabel(a)}`).join(" · ");
  const schedule = [subject.schedule, subject.location].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      aria-labelledby={`disciplina-${subject.node.id}`}
      className="tint tint-rose group flex flex-col p-3 transition-[filter] duration-(--duration-fast) hover:brightness-115 sm:p-4 lg:p-5 lg:px-6"
    >
      <span className="flex items-center gap-3.5">
        <CardTile>{projectMonogram(subject.node.name)}</CardTile>
        <span className="min-w-0 flex-1">
          <span id={`disciplina-${subject.node.id}`} className="block truncate text-[1.1875rem] leading-tight font-bold tracking-tight lg:text-[1.3125rem]">
            {subject.node.name}
          </span>
          {/* Celular: linha única com horário e ações (o card fica compacto, como na lista da maquete). */}
          <span className="block truncate text-caption text-white/60 sm:hidden">
            {[subject.schedule, count(subject.open, "ação", "ações", "")].filter(Boolean).join(" · ") || "Nada aberto"}
          </span>
          <span className="hidden truncate text-caption text-white/60 sm:block">
            {count(subject.open, "ação aberta", "ações abertas", "Nenhuma ação aberta")} ·{" "}
            {count(subject.pending.length, "avaliação aberta", "avaliações abertas", "nenhuma avaliação aberta")}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-5 shrink-0 text-rose-ink opacity-60 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </span>

      <span className="mt-4 hidden gap-1.5 sm:grid">
        <span className={cn("flex min-h-10 items-center gap-2.5 rounded-lg bg-black/22 px-3 py-2 text-sm", !schedule && "text-white/50")}>
          <CalendarClock aria-hidden className="size-4 shrink-0 text-rose-ink/85" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate">{schedule || "Sem horário de aula"}</span>
          {subject.classToday && <span className="shrink-0 font-mono text-xs font-semibold text-rose-ink">hoje</span>}
        </span>
        <span className={cn("flex min-h-10 items-center gap-2.5 rounded-lg bg-black/22 px-3 py-2 text-sm", !grades && "text-white/50")}>
          <Award aria-hidden className="size-4 shrink-0 text-rose-ink/85" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate">{grades ? `Notas: ${grades}` : "Nenhuma nota ainda"}</span>
        </span>
      </span>

      <span className="mt-auto hidden pt-4 sm:block">
        <span className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-caption text-white/55">
          <span className="shrink-0">Próxima avaliação</span>
          <span className="truncate font-medium text-white/85">
            {next
              ? [next.title, next.dueDate ? dueLabel(next.dueDate, today).toLocaleLowerCase("pt-BR") : "sem data", next.dueTime].filter(Boolean).join(" · ")
              : "nada marcado"}
          </span>
        </span>
      </span>
    </Link>
  );
}
