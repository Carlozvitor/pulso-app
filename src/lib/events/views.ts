import type { CalendarEvent, Occurrence } from "@/types/event";
import type { Task, TaskSummary } from "@/types/task";
import { WEEKDAYS_SHORT, addDays, dayTitle, pastDayTitle, startOfWeek, weekday } from "@/lib/dates";
import { toSummary, type ContextOf } from "@/lib/priorities/agora";
import { comparePriority } from "@/lib/priorities/score";
import { occurrencesBetween, type AreaLabel, type Now } from "./occurrences";

const OPEN = new Set<Task["status"]>(["INBOX", "TODO", "IN_PROGRESS"]);

/** Quantos dias à frente mostra "Próximos" e quantos para trás mostra "Concluídos". */
export const UPCOMING_WINDOW = 30;
export const DONE_WINDOW = 30;

export type CalendarDay = {
  date: string;
  /** "Qua" */
  weekdayShort: string;
  /** "30" */
  dayNumber: string;
  /** "Hoje" · "Amanhã" · "Quinta, 1 out" (ou "Ontem"… para trás). */
  label: string;
  isToday: boolean;
  occurrences: Occurrence[];
  /** Prazos de tarefas abertas nesse dia (hoje inclui o que já passou do prazo). */
  deadlines: TaskSummary[];
};

type Sources = {
  events: CalendarEvent[];
  tasks: Task[];
  now: Now;
  areaLabel?: AreaLabel;
  contextOf?: ContextOf;
};

function deadlinesByDay(tasks: Task[], today: string, contextOf: ContextOf): Map<string, TaskSummary[]> {
  const byDay = new Map<string, TaskSummary[]>();
  const dated = tasks
    .filter((t): t is Task & { dueDate: string } => OPEN.has(t.status) && t.dueDate !== null)
    .sort(comparePriority(today));
  for (const task of dated) {
    // O que já passou do prazo aparece em hoje, com "Era pra…" (nunca "atrasado").
    const key = task.dueDate < today ? today : task.dueDate;
    byDay.set(key, [...(byDay.get(key) ?? []), toSummary(task, contextOf)]);
  }
  return byDay;
}

function day(date: string, today: string, occurrences: Occurrence[], deadlines: TaskSummary[], past = false): CalendarDay {
  return {
    date,
    weekdayShort: WEEKDAYS_SHORT[weekday(date)],
    dayNumber: String(Number(date.slice(8, 10))),
    label: past ? pastDayTitle(date, today) : dayTitle(date, today),
    isToday: date === today,
    occurrences,
    deadlines,
  };
}

/** Semana de segunda a domingo que contém `anyDay`. */
export function buildWeek(anyDay: string, { events, tasks, now, areaLabel, contextOf = () => null }: Sources): CalendarDay[] {
  const start = startOfWeek(anyDay);
  const end = addDays(start, 6);
  const occurrences = occurrencesBetween(events, start, end, now, areaLabel);
  const deadlines = deadlinesByDay(tasks, now.date, contextOf);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return day(date, now.date, occurrences.filter((o) => o.date === date), deadlines.get(date) ?? []);
  });
}

/** Hoje: todos os compromissos do dia (o que passou fica marcado) e os prazos. */
export function buildToday({ events, tasks, now, areaLabel, contextOf = () => null }: Sources): CalendarDay {
  return day(
    now.date,
    now.date,
    occurrencesBetween(events, now.date, now.date, now, areaLabel),
    deadlinesByDay(tasks, now.date, contextOf).get(now.date) ?? [],
  );
}

/** Próximos: o que ainda vai acontecer nos próximos 30 dias, por dia. Dias vazios não aparecem. */
export function buildUpcoming({ events, now, areaLabel }: Pick<Sources, "events" | "now" | "areaLabel">): CalendarDay[] {
  const occurrences = occurrencesBetween(events, now.date, addDays(now.date, UPCOMING_WINDOW), now, areaLabel).filter((o) => !o.past);
  return groupByDay(occurrences, now.date, false);
}

/** Concluídos: o que já aconteceu nos últimos 30 dias, do mais recente para o mais antigo. */
export function buildDone({ events, now, areaLabel }: Pick<Sources, "events" | "now" | "areaLabel">): CalendarDay[] {
  const occurrences = occurrencesBetween(events, addDays(now.date, -DONE_WINDOW), now.date, now, areaLabel).filter((o) => o.past);
  return groupByDay(occurrences, now.date, true).reverse().map((d) => ({ ...d, occurrences: [...d.occurrences].reverse() }));
}

function groupByDay(occurrences: Occurrence[], today: string, past: boolean): CalendarDay[] {
  const dates = [...new Set(occurrences.map((o) => o.date))];
  return dates.map((date) => day(date, today, occurrences.filter((o) => o.date === date), [], past));
}
