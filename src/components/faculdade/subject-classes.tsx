"use client";

import { Plus, Repeat } from "lucide-react";
import type { CalendarEvent } from "@/types/event";
import { useEventSheet } from "@/components/events/event-sheet";
import { addMinutesToTime } from "@/lib/dates";
import { daysLabel } from "@/lib/faculdade/summary";

/**
 * Aulas e horários de estudo da disciplina — são compromissos que se repetem, com a disciplina
 * como origem. Toque abre o compromisso; "Novo horário" já vem com a disciplina e a repetição.
 */
export function SubjectClasses({
  subject,
  schedule,
  today,
  canAdd,
}: {
  subject: { id: string; name: string };
  schedule: { event: CalendarEvent; next: string | null }[];
  today: string;
  canAdd: boolean;
}) {
  const { create, edit } = useEventSheet();

  return (
    <div>
      {schedule.length === 0 && <p className="rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60">Nenhum horário de aula ainda.</p>}
      {schedule.length > 0 && (
        <ul className="grid gap-0.5">
          {schedule.map(({ event, next }) => {
            const time = event.startTime
              ? event.durationMinutes
                ? `${event.startTime} – ${addMinutesToTime(event.startTime, event.durationMinutes)}`
                : event.startTime
              : "Dia todo";
            const meta = [event.title, event.location, next === today ? "hoje" : null].filter(Boolean).join(" · ");
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => edit(event.id, next ?? event.startDate)}
                  className="flex min-h-13 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-(--duration-fast) hover:bg-white/5"
                >
                  <span className="w-20 shrink-0 text-xs font-semibold tracking-[0.06em] text-amber-ink uppercase">{daysLabel(event.repeatDays)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="tabular block text-sm font-medium">{time}</span>
                    {meta && <span className="block truncate text-caption text-foreground-subtle">{meta}</span>}
                  </span>
                  <Repeat aria-label="Repete toda semana" className="size-3.5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {canAdd && (
        <button
          type="button"
          onClick={() => create(today, { title: `Aula de ${subject.name}`, areaId: subject.id, repeatWeekly: true })}
          className="mt-1.5 flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-dashed border-border-strong px-3 text-left text-sm text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground"
        >
          <Plus aria-hidden className="size-4" strokeWidth={1.75} />
          Novo horário de aula ou estudo
        </button>
      )}
    </div>
  );
}
