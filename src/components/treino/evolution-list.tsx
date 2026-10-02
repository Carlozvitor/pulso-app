import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { shortDate } from "@/lib/dates";
import { KIND_LABEL, KIND_UNIT, formatNumber, formatValues } from "@/lib/treino/format";
import { dayLabel, type ExerciseSummary } from "@/lib/treino/summary";
import { cn } from "@/lib/utils";
import { kindTag } from "./styles";

/** "40 de 60 kg" · "meta alcançada" — com a barrinha. Sem meta, nada. */
export function GoalBar({ summary, compact }: { summary: ExerciseSummary; compact?: boolean }) {
  const { goal, exercise } = summary;
  if (!goal) return compact ? null : <span className="text-caption text-white/38">Sem meta</span>;
  const unit = KIND_UNIT[exercise.kind];
  return (
    <span className="grid gap-1.5 text-caption text-white/70">
      <span className="tabular">
        {goal.reached ? "Meta alcançada" : `${goal.current !== null ? formatNumber(goal.current) : "0"} de ${formatNumber(goal.target)} ${unit}`}
      </span>
      <span aria-hidden className="h-1 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-lime-ink" style={{ width: `${goal.percent}%` }} />
      </span>
    </span>
  );
}

/** Como começou, curto: "30 kg" na Carga; nos outros, a linha toda ("3×8", "10 min"). */
function startLabel({ exercise, first }: ExerciseSummary): string {
  if (!first) return "–";
  if (exercise.kind === "LOAD" && first.entry.loadKg) return `${formatNumber(first.entry.loadKg)} kg`;
  return formatValues(exercise.kind, first.entry);
}

/**
 * Evolução por exercício: a última vez, quanto mudou desde o começo e a meta.
 * No celular, a meta sai e o "desde o começo" fica à direita.
 */
export function EvolutionList({ items, today, empty }: { items: ExerciseSummary[]; today: string; empty: string }) {
  if (items.length === 0) return <p className="rounded-lg bg-black/20 px-3 py-3.5 text-sm text-white/65">{empty}</p>;

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_1rem] gap-4 px-3.5 pt-1 pb-2 text-[0.6875rem] font-semibold tracking-[0.08em] text-white/45 uppercase lg:grid">
        <span>Exercício</span>
        <span>Última vez</span>
        <span>Desde o começo</span>
        <span>Meta</span>
        <span />
      </div>
      <ul className="grid gap-0.5">
        {items.map((summary) => {
          const { exercise, last, first, change } = summary;
          return (
            <li key={exercise.id}>
              <Link
                href={`/treino/exercicios/${exercise.id}`}
                className="flex min-h-14 items-center gap-3 rounded-lg bg-black/22 px-3.5 py-2.5 transition-colors duration-(--duration-fast) hover:bg-black/35 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_1rem] lg:gap-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[0.9375rem] font-medium">{exercise.name}</span>
                    <span className={cn(kindTag, "hidden sm:inline-flex")}>{KIND_LABEL[exercise.kind]}</span>
                  </span>
                  {/* Celular: a última vez embaixo do nome. */}
                  <span className="tabular block truncate text-caption text-white/50 lg:hidden">
                    {last ? `${formatValues(exercise.kind, last.entry)} · ${dayLabel(last.session.date, today)}` : "Ainda sem registro"}
                  </span>
                </span>
                <span className="tabular hidden text-sm lg:block">
                  {last ? formatValues(exercise.kind, last.entry) : "–"}
                  <span className="block text-caption text-white/50">{last ? dayLabel(last.session.date, today) : "ainda sem registro"}</span>
                </span>
                <span className="shrink-0 text-right lg:text-left">
                  {change ? (
                    <span className={cn("tabular font-mono text-xs font-semibold whitespace-nowrap", change.direction === "up" ? "text-lime-ink" : "text-white/55")}>
                      {change.direction === "same" ? "igual" : change.label}
                    </span>
                  ) : (
                    <span className="text-caption text-white/45">{last ? "1º registro" : ""}</span>
                  )}
                  {first && change && <span className="hidden text-caption text-white/50 lg:block">era {startLabel(summary)} em {shortDate(first.session.date)}</span>}
                </span>
                <span className="hidden lg:block">
                  <GoalBar summary={summary} />
                </span>
                <ChevronRight aria-hidden className="hidden size-4 text-lime-ink/60 lg:block" strokeWidth={1.75} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
