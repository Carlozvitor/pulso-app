"use client";

import type { Assessment } from "@/types/assessment";
import { WEEKDAYS_SHORT, datePill, dueLabel, weekday } from "@/lib/dates";
import { KIND_LABEL, assessmentState, finishedLabel, formatGrade, gradeLabel } from "@/lib/faculdade/assessments";
import { cn } from "@/lib/utils";
import { KIND_ICON, NewAssessmentButton, useAssessmentSheet } from "./assessment-sheet";

const rowClass =
  "flex min-h-14 w-full items-center gap-3 rounded-lg bg-black/22 px-3 py-2.5 text-left transition-colors duration-(--duration-fast) hover:bg-black/35";

function KindTag({ a }: { a: Assessment }) {
  const Icon = KIND_ICON[a.kind];
  return (
    <span className="inline-flex h-[1.375rem] shrink-0 items-center gap-1 rounded-md bg-white/8 px-2 text-[0.71875rem] font-semibold text-[#f5d0e6]">
      <Icon aria-hidden className="size-3 text-rose-ink" strokeWidth={2} />
      {KIND_LABEL[a.kind]}
    </span>
  );
}

function actionsLabel(n: number): string | null {
  if (n === 0) return null;
  return n === 1 ? "1 ação" : `${n} ações`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Próximas avaliações da Faculdade: bloco da data à esquerda, tipo + título, disciplina
 * embaixo; à direita, quando é ("Amanhã · 19:00", "Era pra ontem"). Toque abre a gaveta.
 */
export function UpcomingAssessments({
  items,
  today,
  names,
  linkedCount,
}: {
  items: Assessment[];
  today: string;
  /** Nome de cada disciplina (pelo id da origem). */
  names: Record<string, string>;
  linkedCount: Record<string, number>;
}) {
  const { open } = useAssessmentSheet();
  if (items.length === 0) {
    return <p className="rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60">Nenhuma avaliação pela frente. Quando marcarem uma, anote em “Nova avaliação”.</p>;
  }
  return (
    <ul className="grid gap-0.5">
      {items.map((a) => {
        const late = assessmentState(a, today) === "late";
        const soon = a.dueDate !== null && a.dueDate <= today;
        const meta = [names[a.areaId], a.location, actionsLabel(linkedCount[a.id] ?? 0), a.maxGrade !== null ? `vale ${formatGrade(a.maxGrade)}` : null]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={a.id}>
            <button type="button" onClick={() => open(a.id)} className={cn(rowClass, "pl-2")}>
              <span className={cn("w-11 shrink-0 text-center leading-tight", late && "opacity-50")}>
                {a.dueDate ? (
                  <>
                    <span className="block text-[0.65625rem] font-semibold tracking-[0.08em] text-white/50 uppercase">{WEEKDAYS_SHORT[weekday(a.dueDate)]}</span>
                    <span className="tabular block text-[1.25rem] font-semibold tracking-tight">{Number(a.dueDate.slice(8, 10))}</span>
                  </>
                ) : (
                  <span className="block text-caption text-white/45">—</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <KindTag a={a} />
                  <span className="truncate text-sm font-medium lg:text-[0.9375rem]">{a.title}</span>
                </span>
                {meta && <span className="mt-0.5 block truncate text-caption text-white/55">{meta}</span>}
              </span>
              <span className={cn("tabular shrink-0 text-right font-mono text-xs font-semibold", soon && !late ? "text-amber-ink" : "text-white/60")}>
                {a.dueDate ? capitalize(dueLabel(a.dueDate, today)) : "Sem data"}
                {a.dueTime && <span className="block font-sans text-[0.71875rem] font-medium text-white/45">{a.dueTime}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Avaliações de uma disciplina: abertas em cima; "Feitas" embaixo, com a nota. */
export function SubjectAssessments({
  subjectId,
  pending,
  done,
  today,
  linkedCount,
  canAdd,
}: {
  subjectId: string;
  pending: Assessment[];
  done: Assessment[];
  today: string;
  linkedCount: Record<string, number>;
  canAdd: boolean;
}) {
  const { open } = useAssessmentSheet();

  const when = (a: Assessment) =>
    a.dueDate ? [datePill(a.dueDate), a.dueTime].filter(Boolean).join(" · ") : "Sem data";

  return (
    <div>
      {pending.length === 0 && done.length === 0 && (
        <p className="rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60">Nenhuma avaliação anotada ainda.</p>
      )}

      {pending.length > 0 && (
        <ul className="grid gap-0.5">
          {pending.map((a) => {
            const meta = [when(a), a.maxGrade !== null ? `vale ${formatGrade(a.maxGrade)}` : null, actionsLabel(linkedCount[a.id] ?? 0)]
              .filter(Boolean)
              .join(" · ");
            const soon = a.dueDate !== null && a.dueDate <= today && assessmentState(a, today) === "open";
            return (
              <li key={a.id}>
                <button type="button" onClick={() => open(a.id)} className={rowClass}>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <KindTag a={a} />
                      <span className="truncate text-sm font-medium lg:text-[0.9375rem]">{a.title}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-white/55">{meta}</span>
                  </span>
                  <span className={cn("tabular shrink-0 font-mono text-xs font-semibold", soon ? "text-amber-ink" : "text-white/60")}>
                    {a.dueDate ? capitalize(dueLabel(a.dueDate, today)) : "Sem data"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <p className="px-3 pt-3.5 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.1em] text-white/45 uppercase">Feitas</p>
          <ul className="grid gap-0.5">
            {done.map((a) => {
              const grade = gradeLabel(a);
              const meta = a.doneAt ? `${finishedLabel(a.kind)} · ${when(a)}` : when(a);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => open(a.id)} className={rowClass}>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <KindTag a={a} />
                        <span className="truncate text-sm font-medium lg:text-[0.9375rem]">{a.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-caption text-white/55">{meta}</span>
                    </span>
                    {grade ? (
                      <span className="tabular shrink-0 font-mono text-sm font-semibold text-[#fce7f3]">{grade}</span>
                    ) : (
                      <span className="shrink-0 text-caption text-white/45">sem nota ainda</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {canAdd && <NewAssessmentButton subjectId={subjectId} variant="row" />}
    </div>
  );
}
