import type { Task } from "@/types/task";
import { pastDayTitle, timeLabel, todayIn } from "@/lib/dates";
import type { ContextOf } from "@/lib/priorities/agora";

export type DoneTask = {
  id: string;
  title: string;
  context: string | null;
  /** "14:35", no fuso do usuário. */
  time: string;
};

export type DoneDay = {
  /** Data (YYYY-MM-DD) no fuso do usuário. */
  key: string;
  label: string;
  tasks: DoneTask[];
};

/**
 * Feitas: concluídas agrupadas pelo dia em que foram concluídas (no fuso do usuário),
 * do mais recente para o mais antigo. Dentro do dia, a última concluída primeiro.
 */
export function groupDoneByDay(tasks: Task[], today: string, contextOf: ContextOf = () => null): DoneDay[] {
  const done = tasks
    .filter((t): t is Task & { completedAt: string } => t.status === "DONE" && t.completedAt !== null)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const days = new Map<string, DoneTask[]>();
  for (const task of done) {
    const at = new Date(task.completedAt);
    const key = todayIn(at);
    days.set(key, [...(days.get(key) ?? []), { id: task.id, title: task.title, context: contextOf(task), time: timeLabel(at) }]);
  }
  return [...days.entries()].map(([key, dayTasks]) => ({ key, label: pastDayTitle(key, today), tasks: dayTasks }));
}
