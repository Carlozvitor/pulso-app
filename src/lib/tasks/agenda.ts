import type { Task, TaskSummary } from "@/types/task";
import { addDays, dayTitle } from "@/lib/dates";
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

export type UpcomingBucket = {
  key: "hoje" | "amanha" | "depois" | "semana";
  label: string;
  count: number;
  /** As primeiras (por prioridade), para dar uma ideia do dia. */
  preview: TaskSummary[];
};

/**
 * Os próximos dias em 4 blocos fixos: Hoje (inclui o que já passou), Amanhã,
 * depois de amanhã e o resto da semana (até 7 dias). Blocos vazios também aparecem.
 */
export function upcomingBuckets(
  tasks: Task[],
  today: string,
  contextOf: ContextOf = () => null,
  previewSize = 2,
): UpcomingBucket[] {
  const byPriority = comparePriority(today);
  const dated = openWithDue(tasks);
  const tomorrow = addDays(today, 1);
  const afterTomorrow = addDays(today, 2);
  const weekEnd = addDays(today, 7);
  const weekLabel = dayTitle(weekEnd, today);

  const buckets: [UpcomingBucket["key"], string, (due: string) => boolean][] = [
    ["hoje", "Hoje", (due) => due <= today],
    ["amanha", "Amanhã", (due) => due === tomorrow],
    ["depois", dayTitle(afterTomorrow, today), (due) => due === afterTomorrow],
    ["semana", `Até ${weekLabel.charAt(0).toLowerCase()}${weekLabel.slice(1)}`, (due) => due > afterTomorrow && due <= weekEnd],
  ];

  return buckets.map(([key, label, match]) => {
    const inBucket = dated.filter((t) => match(t.dueDate)).sort(byPriority);
    return {
      key,
      label,
      count: inBucket.length,
      preview: inBucket.slice(0, previewSize).map((t) => toSummary(t, contextOf)),
    };
  });
}
