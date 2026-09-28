import type { AgoraView, Task, TaskSummary } from "@/types/task";
import { addDays } from "@/lib/dates";
import { comparePriority } from "./score";

const OPEN_STATUSES = new Set(["INBOX", "TODO", "IN_PROGRESS"]);

/** Limites da tela Agora: 1 agora + 3 depois + 2 mais tarde. Nunca mais que 6. */
export const AGORA_LIMITS = { next: 3, later: 2 } as const;

/**
 * Entra na Agora: TODO, IN_PROGRESS e itens da Inbox com prazo até amanhã
 * (para nada importante ficar preso na Inbox).
 */
export function isAgoraCandidate(task: Task, today: string): boolean {
  if (task.status === "TODO" || task.status === "IN_PROGRESS") return true;
  if (task.status === "INBOX" && task.dueDate) return task.dueDate <= addDays(today, 1);
  return false;
}

function toSummary(task: Task): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    context: null,
    estimatedMinutes: task.estimatedMinutes,
    dueDate: task.dueDate,
  };
}

export function buildAgoraView(tasks: Task[], today: string): AgoraView {
  const ranked = tasks.filter((t) => isAgoraCandidate(t, today)).sort(comparePriority(today));
  const [now, ...rest] = ranked;
  return {
    today,
    pendingCount: tasks.filter((t) => OPEN_STATUSES.has(t.status)).length,
    now: now ? { ...toSummary(now), status: now.status } : null,
    next: rest.slice(0, AGORA_LIMITS.next).map(toSummary),
    later: rest.slice(AGORA_LIMITS.next, AGORA_LIMITS.next + AGORA_LIMITS.later).map(toSummary),
  };
}
