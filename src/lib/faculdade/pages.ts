import type { Assessment } from "@/types/assessment";
import type { CalendarEvent } from "@/types/event";
import type { Area } from "@/types/project";
import type { Task } from "@/types/task";
import { addDays, nowIn } from "@/lib/dates";
import { listEvents } from "@/lib/events/queries";
import { eventDates, type Now } from "@/lib/events/occurrences";
import { getOriginPage, type OriginPage } from "@/lib/origins/queries";
import { openCounts, type OriginTask } from "@/lib/origins/summary";
import { activeOrigins, descendantIds, indexOrigins, isArchived, originLabel } from "@/lib/origins/tree";
import { contextLabel } from "@/lib/projects/organize";
import { getContextLookup, listAreas } from "@/lib/projects/queries";
import { listOpenTasks } from "@/lib/tasks/queries";
import { attentionLabel, doneAssessments, nextAttention, pendingAssessments } from "./assessments";
import { listAssessments } from "./queries";
import { actionsByAssessment, buildFaculdade, scheduleLabel, subjectSchedule, subjectsOf, type FaculdadeView } from "./summary";

/** Quantas ações aparecem na página da Faculdade (o resto está na Agora, filtrada pelo módulo). */
const ACTIONS_ON_MODULE = 8;

export type FaculdadePage = Omit<FaculdadeView, "actions"> & {
  root: Area;
  actions: OriginTask[];
  /** Abertas na Faculdade inteira. */
  open: number;
  /** Ações abertas ligadas a cada avaliação. */
  linked: Record<string, OriginTask[]>;
  /** Nome de cada origem da Faculdade, sem repetir "Faculdade" ("Marketing Digital"). */
  names: Record<string, string>;
  now: Now;
};

async function sources() {
  const [areas, tasks, lookup, assessments, events] = await Promise.all([
    listAreas(),
    listOpenTasks(),
    getContextLookup(),
    listAssessments(),
    listEvents(),
  ]);
  const root = areas.find((a) => a.module === "FACULDADE" && a.parentId === null);
  return { areas, tasks, lookup, assessments, events, root, now: nowIn() };
}

export async function getFaculdadePage(): Promise<FaculdadePage | null> {
  const { areas, tasks, lookup, assessments, events, root, now } = await sources();
  if (!root) return null;
  // Dentro do módulo, o rótulo não repete "Faculdade": "Marketing Digital · Trabalho final".
  const contextOf = (t: Task) => contextLabel(t, lookup, root.id);
  const areaLabel = (id: string | null) => (id ? originLabel(id, lookup.origins, root.id) : null);
  const inModule = areas.filter((a) => a.module === "FACULDADE");
  const view = buildFaculdade({ rootId: root.id, areas: inModule, assessments, tasks, events, now, contextOf, areaLabel });
  return {
    ...view,
    root,
    actions: view.actions.slice(0, ACTIONS_ON_MODULE),
    open: view.actions.length,
    linked: actionsByAssessment(tasks, now.date, contextOf),
    names: Object.fromEntries(inModule.map((a) => [a.id, areaLabel(a.id) ?? a.name])),
    now,
  };
}

export type SubjectPage = OriginPage & {
  root: Area;
  archived: boolean;
  pending: Assessment[];
  done: Assessment[];
  /** Aulas e estudo que se repetem aqui, com o próximo dia de cada um (para abrir na gaveta). */
  schedule: { event: CalendarEvent; next: string | null }[];
  scheduleLabel: string | null;
  linked: Record<string, OriginTask[]>;
  /** Para escolher a disciplina na gaveta de avaliação. */
  subjects: Area[];
  /** Para a gaveta de compromisso (editar/criar aula). */
  events: CalendarEvent[];
  areas: Area[];
  now: Now;
};

/** Uma disciplina (ou item abaixo dela): avaliações, aulas, contexto e ações. */
export async function getSubjectPage(id: string): Promise<SubjectPage | null> {
  const page = await getOriginPage(id);
  if (!page || page.node.module !== "FACULDADE") return null;
  const { areas, tasks, lookup, assessments, events, root, now } = await sources();
  if (!root) return null;

  const today = now.date;
  const index = indexOrigins(areas);
  const inside = descendantIds(page.node.id, areas);
  const mine = assessments.filter((a) => inside.has(a.areaId));
  const schedule = subjectSchedule(events, inside, today);
  const contextOf = (t: Task) => contextLabel(t, lookup, page.node.id);
  const archived = isArchived(page.node.id, index);

  return {
    ...page,
    // Disciplina com avaliações não apaga (o banco também recusa): encerra-se.
    canDelete: page.canDelete && mine.length === 0,
    root,
    archived,
    pending: pendingAssessments(mine, today),
    done: doneAssessments(mine, today),
    schedule: schedule.map((event) => ({ event, next: eventDates(event, today, addDays(today, 7))[0] ?? null })),
    scheduleLabel: scheduleLabel(schedule),
    linked: actionsByAssessment(tasks, today, contextOf),
    subjects: subjectsOf(root.id, activeOrigins(areas, page.node.id)),
    events,
    // Todas: o campo Origem esconde as encerradas sozinho, mas precisa delas para mostrar a atual.
    areas,
    now,
  };
}

/** Barra lateral e card da Central: as disciplinas valendo, as abertas de cada uma e a próxima atenção. */
export async function getFaculdadeNav(): Promise<{ areas: Area[]; counts: Map<string, number>; attention: string | null } | null> {
  const { areas, tasks, assessments, root, now } = await sources();
  if (!root) return null;
  const inModule = areas.filter((a) => a.module === "FACULDADE");
  const live = activeOrigins(inModule);
  const liveIds = new Set(live.map((a) => a.id));
  const next = nextAttention(
    assessments.filter((a) => liveIds.has(a.areaId)),
    now.date,
  );
  // As abertas contam também o que ficou em disciplina encerrada (continua no PULSO).
  return { areas: live, counts: openCounts(inModule, tasks), attention: next ? attentionLabel(next, now.date) : null };
}
