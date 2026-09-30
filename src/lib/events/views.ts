import type { Assessment } from "@/types/assessment";
import type { CalendarEvent, Occurrence } from "@/types/event";
import type { Task, TaskSummary } from "@/types/task";
import { WEEKDAYS_SHORT, addDays, dayTitle, pastDayTitle, startOfWeek, weekday } from "@/lib/dates";
import { compareByDate, toAgendaAssessment, type AgendaAssessment } from "@/lib/faculdade/assessments";
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
  /** Provas e entregas da Faculdade nesse dia (hoje inclui trabalho que passou do dia sem entregar). */
  assessments: AgendaAssessment[];
};

type Sources = {
  events: CalendarEvent[];
  tasks: Task[];
  now: Now;
  /** Avaliações da Faculdade (a data mora nelas; a agenda só lê). */
  assessments?: Assessment[];
  areaLabel?: AreaLabel;
  contextOf?: ContextOf;
};

type AssessmentFilter = (a: AgendaAssessment) => boolean;

/** Avaliações com data em [from, to], por dia. O que passou do dia sem entregar aparece em hoje. */
function assessmentsByDay(
  assessments: Assessment[],
  today: string,
  from: string,
  to: string,
  areaLabel: AreaLabel = () => null,
  keep: AssessmentFilter = () => true,
): Map<string, AgendaAssessment[]> {
  const byDay = new Map<string, AgendaAssessment[]>();
  const dated = assessments.filter((a): a is Assessment & { dueDate: string } => a.dueDate !== null).sort(compareByDate);
  for (const a of dated) {
    const item = toAgendaAssessment(a, today, areaLabel);
    const key = item.state === "late" ? today : item.dueDate;
    if (key < from || key > to || !keep(item)) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  return byDay;
}

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

function day(
  date: string,
  today: string,
  occurrences: Occurrence[],
  deadlines: TaskSummary[],
  assessments: AgendaAssessment[],
  past = false,
): CalendarDay {
  return {
    date,
    weekdayShort: WEEKDAYS_SHORT[weekday(date)],
    dayNumber: String(Number(date.slice(8, 10))),
    label: past ? pastDayTitle(date, today) : dayTitle(date, today),
    isToday: date === today,
    occurrences,
    deadlines,
    assessments,
  };
}

/** Semana de segunda a domingo que contém `anyDay`. */
export function buildWeek(anyDay: string, { events, tasks, now, assessments = [], areaLabel, contextOf = () => null }: Sources): CalendarDay[] {
  const start = startOfWeek(anyDay);
  const end = addDays(start, 6);
  const occurrences = occurrencesBetween(events, start, end, now, areaLabel);
  const deadlines = deadlinesByDay(tasks, now.date, contextOf);
  const exams = assessmentsByDay(assessments, now.date, start, end, areaLabel);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return day(date, now.date, occurrences.filter((o) => o.date === date), deadlines.get(date) ?? [], exams.get(date) ?? []);
  });
}

/** Hoje: todos os compromissos do dia (o que passou fica marcado), as avaliações e os prazos. */
export function buildToday({ events, tasks, now, assessments = [], areaLabel, contextOf = () => null }: Sources): CalendarDay {
  return day(
    now.date,
    now.date,
    occurrencesBetween(events, now.date, now.date, now, areaLabel),
    deadlinesByDay(tasks, now.date, contextOf).get(now.date) ?? [],
    assessmentsByDay(assessments, now.date, now.date, now.date, areaLabel).get(now.date) ?? [],
  );
}

type ListSources = Pick<Sources, "events" | "now" | "assessments" | "areaLabel">;

/** Próximos: o que ainda vai acontecer nos próximos 30 dias, por dia. Dias vazios não aparecem. */
export function buildUpcoming({ events, now, assessments = [], areaLabel }: ListSources): CalendarDay[] {
  const to = addDays(now.date, UPCOMING_WINDOW);
  const occurrences = occurrencesBetween(events, now.date, to, now, areaLabel).filter((o) => !o.past);
  const exams = assessmentsByDay(assessments, now.date, now.date, to, areaLabel, (a) => a.state !== "done");
  return groupByDay(occurrences, exams, now.date, false);
}

/** Concluídos: o que já aconteceu nos últimos 30 dias, do mais recente para o mais antigo. */
export function buildDone({ events, now, assessments = [], areaLabel }: ListSources): CalendarDay[] {
  const from = addDays(now.date, -DONE_WINDOW);
  const occurrences = occurrencesBetween(events, from, now.date, now, areaLabel).filter((o) => o.past);
  const exams = assessmentsByDay(assessments, now.date, from, now.date, areaLabel, (a) => a.state === "done");
  return groupByDay(occurrences, exams, now.date, true)
    .reverse()
    .map((d) => ({ ...d, occurrences: [...d.occurrences].reverse() }));
}

function groupByDay(occurrences: Occurrence[], exams: Map<string, AgendaAssessment[]>, today: string, past: boolean): CalendarDay[] {
  const dates = [...new Set([...occurrences.map((o) => o.date), ...exams.keys()])].sort();
  return dates.map((date) => day(date, today, occurrences.filter((o) => o.date === date), [], exams.get(date) ?? [], past));
}
