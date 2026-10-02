"use client";

import { CalendarClock, CalendarPlus } from "lucide-react";
import type { Occurrence } from "@/types/event";
import { useEventSheet } from "@/components/events/event-sheet";

/** "Academia 20:00": o compromisso do Treino de hoje. Toque abre para editar. */
export function AcademyChip({ occurrence }: { occurrence: Occurrence }) {
  const { edit } = useEventSheet();
  return (
    <button
      type="button"
      onClick={() => edit(occurrence.eventId, occurrence.date)}
      className="inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-lg bg-black/25 px-2.5 text-caption text-white/85 transition-colors duration-(--duration-fast) hover:bg-black/40"
    >
      <CalendarClock aria-hidden className="size-3.5 shrink-0 text-amber-ink" strokeWidth={1.75} />
      <span className="truncate">{occurrence.title}</span>
      <span className="tabular font-mono text-xs font-semibold text-amber-ink">{occurrence.startTime ?? "dia todo"}</span>
    </button>
  );
}

/** Sem horário da academia ainda: cria um compromisso que se repete, com origem Treino. */
export function ScheduleAcademyButton({ rootId, today }: { rootId: string; today: string }) {
  const { create } = useEventSheet();
  return (
    <button
      type="button"
      onClick={() => create(today, { title: "Academia", areaId: rootId, repeatWeekly: true })}
      className="inline-flex min-h-11 items-center gap-1.5 text-caption text-white/60 transition-colors duration-(--duration-fast) hover:text-white"
    >
      <CalendarPlus aria-hidden className="size-3.5" strokeWidth={1.75} />
      Marcar horário da academia
    </button>
  );
}
