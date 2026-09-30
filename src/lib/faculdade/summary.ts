import type { Assessment } from "@/types/assessment";
import type { CalendarEvent, Occurrence } from "@/types/event";
import type { Area } from "@/types/project";
import type { Task } from "@/types/task";
import { WEEKDAYS_SHORT, addDays, startOfWeek } from "@/lib/dates";
import { isRecurring, occurrencesBetween, type AreaLabel, type Now } from "@/lib/events/occurrences";
import { openCounts, originActions, type OriginTask } from "@/lib/origins/summary";
import { descendantIds, indexOrigins, isArchived } from "@/lib/origins/tree";
import { toSummary, type ContextOf } from "@/lib/priorities/agora";
import { comparePriority } from "@/lib/priorities/score";
import { compareByDate, pendingAssessments } from "./assessments";

/** Uma disciplina no card da Faculdade. */
export type SubjectSummary = {
  node: Area;
  /** Ações abertas no PULSO (contando subitens). */
  open: number;
  /** Avaliações abertas e "era pra", por data. */
  pending: Assessment[];
  /** Notas lançadas, da mais antiga para a mais nova. */
  grades: Assessment[];
  /** "Seg e qua · 19:00", das aulas/estudo que se repetem. */
  schedule: string | null;
  /** Local da primeira aula que tiver um. */
  location: string | null;
  /** Tem aula (ou estudo) hoje. */
  classToday: boolean;
};

/** Uma aula (ou estudo) da semana, com as avaliações da mesma disciplina naquele dia. */
export type WeekClass = Occurrence & { flags: string[] };

export type FaculdadeView = {
  subjects: SubjectSummary[];
  /** Disciplinas encerradas (guardadas). */
  closed: Area[];
  /** Pendentes das disciplinas valendo, por data (sem data no fim). */
  upcoming: Assessment[];
  /** Aulas e estudo desta semana (segunda a domingo). */
  week: WeekClass[];
  /** Ações abertas na Faculdade inteira, por prioridade. */
  actions: OriginTask[];
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const bySiblingOrder = (a: Area, b: Area) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR");

/** Disciplinas = primeiro nível dentro de Faculdade. */
export function subjectsOf(rootId: string, areas: Area[]): Area[] {
  return areas.filter((a) => a.parentId === rootId).sort(bySiblingOrder);
}

/** Aulas e estudo que se repetem nesta disciplina (e abaixo) e ainda valem. */
export function subjectSchedule(events: CalendarEvent[], inside: Set<string>, today: string): CalendarEvent[] {
  const first = (e: CalendarEvent) => Math.min(...e.repeatDays.map((d) => WEEK_ORDER.indexOf(d)));
  return events
    .filter((e) => e.areaId && inside.has(e.areaId) && isRecurring(e) && (!e.repeatUntil || e.repeatUntil >= today))
    .sort((a, b) => first(a) - first(b) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

/** [1, 3] → "Seg e qua"; [1, 3, 5] → "Seg, qua e sex". */
export function daysLabel(days: number[]): string {
  const names = [...days]
    .sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b))
    .map((d, i) => (i === 0 ? WEEKDAYS_SHORT[d] : WEEKDAYS_SHORT[d].toLocaleLowerCase("pt-BR")));
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/** "Seg e qua · 19:00" — mais de uma regra fica "Ter · 19:00 + Sáb · 09:00". */
export function scheduleLabel(events: CalendarEvent[]): string | null {
  if (events.length === 0) return null;
  return events.map((e) => (e.startTime ? `${daysLabel(e.repeatDays)} · ${e.startTime}` : daysLabel(e.repeatDays))).join(" + ");
}

type Sources = {
  rootId: string;
  areas: Area[];
  assessments: Assessment[];
  tasks: Task[];
  events: CalendarEvent[];
  now: Now;
  contextOf?: ContextOf;
  areaLabel?: AreaLabel;
};

/** A tela da Faculdade: próximas avaliações, aulas da semana, disciplinas e ações. */
export function buildFaculdade({ rootId, areas, assessments, tasks, events, now, contextOf = () => null, areaLabel }: Sources): FaculdadeView {
  const today = now.date;
  const index = indexOrigins(areas);
  const counts = openCounts(areas, tasks);
  const all = subjectsOf(rootId, areas);
  const active = all.filter((s) => s.archivedAt === null);
  const inFaculdade = descendantIds(rootId, areas);
  const live = (areaId: string | null) => areaId !== null && inFaculdade.has(areaId) && !isArchived(areaId, index);

  const subjects = active.map((node): SubjectSummary => {
    const inside = descendantIds(node.id, areas);
    const mine = assessments.filter((a) => inside.has(a.areaId));
    const schedule = subjectSchedule(events, inside, today);
    return {
      node,
      open: counts.get(node.id) ?? 0,
      pending: pendingAssessments(mine, today),
      grades: mine.filter((a) => a.grade !== null).sort(compareByDate),
      schedule: scheduleLabel(schedule),
      location: schedule.find((e) => e.location)?.location ?? null,
      classToday: occurrencesBetween(schedule, today, today, now).length > 0,
    };
  });

  const start = startOfWeek(today);
  const week = occurrencesBetween(
    events.filter((e) => live(e.areaId)),
    start,
    addDays(start, 6),
    now,
    areaLabel,
  ).map((o): WeekClass => ({
    ...o,
    flags: assessments.filter((a) => a.dueDate === o.date && a.areaId === o.areaId).sort(compareByDate).map((a) => a.title),
  }));

  return {
    subjects,
    closed: all.filter((s) => s.archivedAt !== null),
    upcoming: pendingAssessments(
      assessments.filter((a) => live(a.areaId)),
      today,
    ),
    week,
    actions: originActions(rootId, areas, tasks, today, contextOf),
  };
}

const OPEN = new Set<Task["status"]>(["INBOX", "TODO", "IN_PROGRESS"]);

/** Ações abertas ligadas a cada avaliação (por prioridade), para a gaveta e o "2 ações" das linhas. */
export function actionsByAssessment(tasks: Task[], today: string, contextOf: ContextOf = () => null): Record<string, OriginTask[]> {
  const byId: Record<string, OriginTask[]> = {};
  const linked = tasks.filter((t): t is Task & { assessmentId: string } => t.assessmentId !== null && OPEN.has(t.status));
  for (const task of linked.sort(comparePriority(today))) {
    (byId[task.assessmentId] ??= []).push({ ...toSummary(task, contextOf), status: task.status });
  }
  return byId;
}
