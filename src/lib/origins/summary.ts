import type { Area } from "@/types/project";
import type { Task, TaskStatus, TaskSummary } from "@/types/task";
import { addDays, todayIn } from "@/lib/dates";
import { isAgoraCandidate, toSummary, type ContextOf } from "@/lib/priorities/agora";
import { comparePriority } from "@/lib/priorities/score";
import { descendantIds } from "./tree";

const OPEN = new Set<TaskStatus>(["INBOX", "TODO", "IN_PROGRESS"]);

/** Tarefa numa lista de origem: com status, para marcar "em andamento". */
export type OriginTask = TaskSummary & { status: TaskStatus };

export type OriginCount = { node: Area; open: number };

/** Uma frente (primeiro nível do módulo) no card da página do módulo. */
export type FrontSummary = OriginCount & {
  subs: OriginCount[];
  /** A primeira pela prioridade — o que a Agora mostraria desta frente. */
  next: TaskSummary | null;
};

const isOpen = (t: Task) => OPEN.has(t.status);

/** Abertas por item, contando os subitens (Valentine inclui Conteúdo e Instagram). */
export function openCounts(areas: Area[], tasks: Task[]): Map<string, number> {
  const direct = new Map<string, number>();
  for (const task of tasks) {
    if (task.areaId && isOpen(task)) direct.set(task.areaId, (direct.get(task.areaId) ?? 0) + 1);
  }
  return new Map(
    areas.map((area) => {
      let total = 0;
      for (const id of descendantIds(area.id, areas)) total += direct.get(id) ?? 0;
      return [area.id, total];
    }),
  );
}

const siblings = (areas: Area[], parentId: string) =>
  areas
    .filter((a) => a.parentId === parentId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR"));

/** A próxima ação de um item (e do que está abaixo): a primeira que a Agora mostraria. */
export function nextActionIn(
  id: string,
  areas: Area[],
  tasks: Task[],
  today: string,
  contextOf: ContextOf = () => null,
): TaskSummary | null {
  const inside = descendantIds(id, areas);
  const [next] = tasks.filter((t) => t.areaId && inside.has(t.areaId) && isAgoraCandidate(t, today)).sort(comparePriority(today));
  return next ? toSummary(next, contextOf) : null;
}

/** Frentes de um módulo: cada filho da raiz, com os subitens e a próxima ação. */
export function summarizeFronts(
  rootId: string,
  areas: Area[],
  tasks: Task[],
  today: string,
  contextOf: ContextOf = () => null,
): FrontSummary[] {
  const counts = openCounts(areas, tasks);
  return siblings(areas, rootId).map((front) => ({
    node: front,
    open: counts.get(front.id) ?? 0,
    subs: siblings(areas, front.id).map((sub) => ({ node: sub, open: counts.get(sub.id) ?? 0 })),
    next: nextActionIn(front.id, areas, tasks, today, contextOf),
  }));
}

/** Ações abertas de um item e dos subitens, por prioridade (em andamento no topo). */
export function originActions(
  id: string,
  areas: Area[],
  tasks: Task[],
  today: string,
  contextOf: ContextOf = () => null,
): OriginTask[] {
  const inside = descendantIds(id, areas);
  return tasks
    .filter((t) => isOpen(t) && t.areaId && inside.has(t.areaId))
    .sort(comparePriority(today))
    .map((t) => ({ ...toSummary(t, contextOf), status: t.status }));
}

/** Quantas foram concluídas nos últimos `days` dias (hoje incluso), neste item e abaixo. */
export function doneRecently(id: string, areas: Area[], tasks: Task[], today: string, days = 7): number {
  const inside = descendantIds(id, areas);
  const since = addDays(today, -(days - 1));
  return tasks.filter(
    (t) => t.status === "DONE" && t.completedAt && t.areaId && inside.has(t.areaId) && todayIn(new Date(t.completedAt)) >= since,
  ).length;
}
