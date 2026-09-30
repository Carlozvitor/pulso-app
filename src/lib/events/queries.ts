import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { nowIn } from "@/lib/dates";
import { listAssessments } from "@/lib/faculdade/queries";
import { isArchived, originLabel } from "@/lib/origins/tree";
import { contextLabel } from "@/lib/projects/organize";
import { getContextLookup } from "@/lib/projects/queries";
import { listOpenTasks } from "@/lib/tasks/queries";
import type { CalendarEvent } from "@/types/event";
import type { Task } from "@/types/task";
import { EVENT_COLUMNS, eventRowSchema } from "./schemas";
import { occurrencesBetween, type AreaLabel, type Now } from "./occurrences";
import { buildDone, buildToday, buildUpcoming, buildWeek, type CalendarDay } from "./views";

const eventRows = z.array(eventRowSchema);

/** Todos os compromissos (volume pessoal); a expansão das repetições é feita em memória. */
export const listEvents = cache(async function listEvents(): Promise<CalendarEvent[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("events").select(EVENT_COLUMNS);
  if (error) throw error;
  return eventRows.parse(data);
});

export type CalendarView = "hoje" | "semana" | "proximos" | "concluidos";

export type CompromissosPage = {
  view: CalendarView;
  now: Now;
  days: CalendarDay[];
  events: CalendarEvent[];
};

async function sources() {
  const [events, tasks, lookup, assessments] = await Promise.all([listEvents(), listOpenTasks(), getContextLookup(), listAssessments()]);
  const areaLabel: AreaLabel = (id) => (id ? originLabel(id, lookup.origins) : null);
  const contextOf = (t: Task) => contextLabel(t, lookup);
  // Disciplina encerrada sai da agenda junto com as avaliações dela.
  const live = assessments.filter((a) => !isArchived(a.areaId, lookup.origins));
  return { events, tasks, assessments: live, now: nowIn(), areaLabel, contextOf };
}

/** `anyDay`: um dia da semana a mostrar (na visão Semana). */
export async function getCompromissosPage(view: CalendarView, anyDay?: string): Promise<CompromissosPage> {
  const src = await sources();
  const days =
    view === "hoje"
      ? [buildToday(src)]
      : view === "proximos"
        ? buildUpcoming(src)
        : view === "concluidos"
          ? buildDone(src)
          : buildWeek(anyDay ?? src.now.date, src);
  return { view, now: src.now, days, events: src.events };
}

/** Resumo para a barra lateral e a Central: quantos hoje e o próximo que ainda não passou. */
export async function getTodaySummary(): Promise<{ count: number; next: { time: string | null; title: string } | null }> {
  const events = await listEvents();
  const now = nowIn();
  const today = occurrencesBetween(events, now.date, now.date, now);
  const next = today.find((o) => !o.past);
  return { count: today.length, next: next ? { time: next.startTime, title: next.title } : null };
}
