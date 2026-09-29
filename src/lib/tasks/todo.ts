import type { Task, TaskSummary } from "@/types/task";
import { comparePriority } from "@/lib/priorities/score";
import { isPaused, isSnoozed, toSummary, type ContextOf } from "@/lib/priorities/agora";

export type TodoSections = {
  inProgress: TaskSummary[];
  paused: TaskSummary[];
  todo: TaskSummary[];
  /** "Agora não": guardadas até o dia marcado. */
  later: (TaskSummary & { snoozedUntil: string })[];
};

/**
 * Tela A fazer: tudo que está para fazer (TODO + em andamento), em blocos.
 * Cada bloco na ordem de prioridade. A Inbox fica de fora (tem tela própria).
 */
export function todoSections(tasks: Task[], today: string, contextOf: ContextOf = () => null): TodoSections {
  const open = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS").sort(comparePriority(today));
  const summary = (t: Task) => toSummary(t, contextOf);
  return {
    inProgress: open.filter((t) => t.status === "IN_PROGRESS").map(summary),
    paused: open.filter((t) => isPaused(t) && !isSnoozed(t, today)).map(summary),
    todo: open.filter((t) => t.status === "TODO" && !isPaused(t) && !isSnoozed(t, today)).map(summary),
    later: open
      .filter((t) => t.status === "TODO" && isSnoozed(t, today))
      .map((t) => ({ ...summary(t), snoozedUntil: t.snoozedUntil! }))
      .sort((a, b) => a.snoozedUntil.localeCompare(b.snoozedUntil)),
  };
}
