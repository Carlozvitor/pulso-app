import type { Task, TaskSummary } from "@/types/task";
import { dayTitle } from "@/lib/dates";
import { comparePriority } from "@/lib/priorities/score";
import { toSummary, type ContextOf } from "@/lib/priorities/agora";

const OPEN = new Set<Task["status"]>(["INBOX", "TODO", "IN_PROGRESS"]);

function openWithDue(tasks: Task[]): (Task & { dueDate: string })[] {
  return tasks.filter((t): t is Task & { dueDate: string } => OPEN.has(t.status) && t.dueDate !== null);
}

export type DayGroup = {
  /** "antes" para o que já passou do prazo; senão a data (YYYY-MM-DD). */
  key: string;
  label: string;
  tasks: TaskSummary[];
};

/** Rótulo do grupo de prazos que já passaram — neutro, nunca "atrasado". */
export const BEFORE_TODAY_LABEL = "Era pra antes de hoje";

/**
 * Agenda: tarefas abertas com prazo, um grupo por dia, em ordem.
 * O que já passou do prazo fica junto, no topo. Dentro do dia, ordem de prioridade.
 */
export function agendaDays(tasks: Task[], today: string, contextOf: ContextOf = () => null): DayGroup[] {
  const byPriority = comparePriority(today);
  const groups = new Map<string, Task[]>();
  for (const task of openWithDue(tasks)) {
    const key = task.dueDate < today ? "antes" : task.dueDate;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "antes" ? -1 : b === "antes" ? 1 : a.localeCompare(b)))
    .map(([key, dayTasks]) => ({
      key,
      label: key === "antes" ? BEFORE_TODAY_LABEL : dayTitle(key, today),
      tasks: dayTasks.sort(byPriority).map((t) => toSummary(t, contextOf)),
    }));
}
