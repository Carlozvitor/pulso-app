import type { Task } from "@/types/task";
import { daysBetween, endOfWeek, todayIn } from "@/lib/dates";

/**
 * Pesos do motor de prioridade. Mudar a ordem da Agora = mexer aqui.
 * nota = importância × importance + urgência efetiva × urgency + bônus
 */
export const WEIGHTS = {
  importance: 3,
  urgency: 3,
  /** Importância sem valor conta como Média. */
  defaultImportance: 3,
  /** Tarefas curtas (≤ quickMinutes) ganham um empurrão. */
  quickMinutes: 15,
  quickBonus: 2,
  /** +1 por semana parada, até o teto — para nada ficar esquecido. */
  staleBonusPerWeek: 1,
  staleBonusMax: 3,
} as const;

/**
 * Urgência que vem do prazo (0–5): vencido/hoje 5 · amanhã 4 · esta semana 3 ·
 * até 14 dias 2 · mais longe 1 · sem prazo 0.
 */
export function dueUrgency(dueDate: string | null, today: string): number {
  if (!dueDate) return 0;
  const diff = daysBetween(today, dueDate);
  if (diff <= 0) return 5;
  if (diff === 1) return 4;
  if (dueDate <= endOfWeek(today)) return 3;
  if (diff <= 14) return 2;
  return 1;
}

/** A maior entre a urgência marcada e a do prazo — as duas não somam. */
export function effectiveUrgency(task: Task, today: string): number {
  return Math.max(task.urgency ?? 0, dueUrgency(task.dueDate, today));
}

export function priorityScore(task: Task, today: string): number {
  const importance = task.importance ?? WEIGHTS.defaultImportance;
  const quick =
    task.estimatedMinutes != null && task.estimatedMinutes <= WEIGHTS.quickMinutes ? WEIGHTS.quickBonus : 0;
  const idleWeeks = Math.floor(daysBetween(todayIn(new Date(task.updatedAt)), today) / 7);
  const stale = Math.min(Math.max(idleWeeks, 0) * WEIGHTS.staleBonusPerWeek, WEIGHTS.staleBonusMax);

  return importance * WEIGHTS.importance + effectiveUrgency(task, today) * WEIGHTS.urgency + quick + stale;
}

/**
 * Ordem da Agora: em andamento fixo no topo → maior nota → prazo mais cedo → mais antiga.
 */
export function comparePriority(today: string) {
  const scores = new Map<string, number>();
  const score = (t: Task) => {
    let s = scores.get(t.id);
    if (s === undefined) {
      s = priorityScore(t, today);
      scores.set(t.id, s);
    }
    return s;
  };

  return (a: Task, b: Task): number => {
    const progress = Number(b.status === "IN_PROGRESS") - Number(a.status === "IN_PROGRESS");
    if (progress !== 0) return progress;
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return a.createdAt.localeCompare(b.createdAt);
  };
}
