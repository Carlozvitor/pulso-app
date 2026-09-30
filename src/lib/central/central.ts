import type { Assessment } from "@/types/assessment";
import type { CalendarEvent, Occurrence } from "@/types/event";
import type { ProjectProgress, ProjectSummary } from "@/types/project";
import type { AgoraView, Task } from "@/types/task";
import { addDays } from "@/lib/dates";
import { isPending, toAgendaAssessment } from "@/lib/faculdade/assessments";
import { occurrencesBetween, type AreaLabel, type Now } from "@/lib/events/occurrences";
import { buildAgoraView, type ContextOf } from "@/lib/priorities/agora";
import { comparePriority } from "@/lib/priorities/score";

/** Central: 1 agora + 2 depois; Hoje e Próximas atenções mostram até 6 cada. */
export const CENTRAL_LIMITS = { next: 2, today: 6, upcoming: 6 } as const;

/** Até quantos dias à frente algo vira "Próxima atenção". */
export const UPCOMING_DAYS = 7;

const OPEN = new Set<Task["status"]>(["INBOX", "TODO", "IN_PROGRESS"]);

/** Uma linha de Hoje ou de Próximas atenções: compromisso, avaliação, prazo de tarefa ou de projeto. */
export type AttentionItem =
  | { kind: "event"; id: string; title: string; date: string; time: string | null; context: string | null }
  | { kind: "assessment"; id: string; areaId: string; title: string; date: string; time: string | null; context: string | null }
  | { kind: "task"; id: string; title: string; context: string | null; date: string }
  | { kind: "project"; id: string; title: string; date: string; progress: ProjectProgress };

export type AttentionList = {
  items: AttentionItem[];
  /** Quantos ficaram de fora do limite. */
  more: number;
};

export type CentralView = {
  today: string;
  pendingCount: number;
  now: AgoraView["now"];
  next: AgoraView["next"];
  /** Compromissos de hoje que ainda não passaram, por horário. */
  todayEvents: Occurrence[];
  /** Prazos de hoje — inclui o que já passou ("Era pra …"). */
  todayList: AttentionList;
  /** Amanhã até 7 dias: prazos e compromissos avulsos (a rotina que se repete fica de fora). */
  upcoming: AttentionList;
};

/**
 * Agenda para a Central (opcional: sem ela, só prazos). Avaliações: só as das disciplinas
 * valendo (as encerradas ficam de fora antes de chegar aqui).
 */
export type CentralAgenda = { events: CalendarEvent[]; now: Now; areaLabel?: AreaLabel; assessments?: Assessment[] };

const KIND_ORDER: Record<AttentionItem["kind"], number> = { event: 0, assessment: 1, task: 2, project: 3 };

const timeOf = (item: AttentionItem) => (item.kind === "event" || item.kind === "assessment" ? item.time : null);

/**
 * Ordem das linhas: data mais cedo primeiro; no mesmo dia, compromissos, depois avaliações
 * (pelo horário, sem horário depois), depois tarefas (por prioridade), depois projetos (por nome).
 */
function sortItems(items: AttentionItem[], taskRank: Map<string, number>): AttentionItem[] {
  return items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (a.kind === "task") return (taskRank.get(a.id) ?? 0) - (taskRank.get(b.id) ?? 0);
    const [ta, tb] = [timeOf(a), timeOf(b)];
    if (ta !== tb) return (ta ?? "99:99").localeCompare(tb ?? "99:99");
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

function limit(items: AttentionItem[], max: number): AttentionList {
  return { items: items.slice(0, max), more: Math.max(0, items.length - max) };
}

/**
 * A síntese da Central: o que fazer agora (do motor da Agora), o que acontece e vence hoje
 * e o que vem nos próximos dias. Só projetos ativos com prazo entram.
 */
export function buildCentral(
  tasks: Task[],
  projects: ProjectSummary[],
  today: string,
  contextOf: ContextOf = () => null,
  agenda?: CentralAgenda,
): CentralView {
  const agora = buildAgoraView(tasks, today, contextOf);
  const horizon = addDays(today, UPCOMING_DAYS);

  const dated = tasks
    .filter((t): t is Task & { dueDate: string } => OPEN.has(t.status) && t.dueDate !== null)
    .sort(comparePriority(today));
  const taskRank = new Map(dated.map((t, i) => [t.id, i]));

  const upcomingEvents = agenda
    ? occurrencesBetween(agenda.events, addDays(today, 1), horizon, agenda.now, agenda.areaLabel).filter((o) => !o.recurring)
    : [];

  const items: AttentionItem[] = [
    ...dated.map((t): AttentionItem => ({ kind: "task", id: t.id, title: t.title, context: contextOf(t), date: t.dueDate })),
    ...projects
      .filter((p): p is ProjectSummary & { dueDate: string } => p.status === "ACTIVE" && p.dueDate !== null)
      .map((p): AttentionItem => ({ kind: "project", id: p.id, title: p.name, date: p.dueDate, progress: p.progress })),
    ...upcomingEvents.map(
      (o): AttentionItem => ({
        kind: "event",
        id: o.eventId,
        title: o.title,
        date: o.date,
        time: o.startTime,
        context: [o.location, o.context].filter(Boolean).join(" · ") || null,
      }),
    ),
    // Avaliações pendentes: a data é a delas (a que passou sem entregar aparece em Hoje como "Era pra …").
    ...(agenda?.assessments ?? [])
      .filter((a): a is Assessment & { dueDate: string } => a.dueDate !== null && isPending(a, today))
      .map((a): AttentionItem => {
        const item = toAgendaAssessment(a, today, agenda?.areaLabel);
        return {
          kind: "assessment",
          id: a.id,
          areaId: a.areaId,
          title: item.title,
          date: a.dueDate,
          time: a.dueTime,
          context: [item.context, a.location].filter(Boolean).join(" · ") || null,
        };
      }),
  ];
  const sorted = sortItems(items, taskRank);

  return {
    today,
    pendingCount: agora.pendingCount,
    now: agora.now,
    next: agora.next.slice(0, CENTRAL_LIMITS.next),
    todayEvents: agenda
      ? occurrencesBetween(agenda.events, today, today, agenda.now, agenda.areaLabel).filter((o) => !o.past)
      : [],
    todayList: limit(sorted.filter((i) => i.kind !== "event" && i.date <= today), CENTRAL_LIMITS.today),
    upcoming: limit(sorted.filter((i) => i.date > today && i.date <= horizon), CENTRAL_LIMITS.upcoming),
  };
}
