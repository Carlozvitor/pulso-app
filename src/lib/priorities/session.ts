import type { Energy, Task } from "@/types/task";
import { isAgoraCandidate } from "./agora";
import { comparePriority, priorityScore } from "./score";

export const SESSION_LIMITS = {
  /** Sessão curta: nunca mais que isso de tarefas. */
  maxTasks: 5,
  /** Tarefa sem duração conta como ~15 min. */
  defaultMinutes: 15,
  /** Com energia Alta, tarefas pesadas ganham este empurrão. */
  highEnergyBonus: 3,
} as const;

const ENERGY_RANK: Record<Energy, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * Cabe na energia de agora? Baixa → só leves · Normal → leves e médias · Alta → todas.
 * Tarefa sem energia marcada cabe em qualquer sessão.
 */
export function fitsEnergy(taskEnergy: Energy | null, available: Energy): boolean {
  return taskEnergy === null || ENERGY_RANK[taskEnergy] <= ENERGY_RANK[available];
}

export function sessionMinutes(task: Pick<Task, "estimatedMinutes">): number {
  return task.estimatedMinutes ?? SESSION_LIMITS.defaultMinutes;
}

export type SessionRequest = {
  minutes: number;
  energy: Energy;
  today: string;
  /** Tarefas recusadas com "Agora não". */
  skip?: ReadonlySet<string>;
};

export type SessionPlan = {
  tasks: Task[];
  /** Soma das durações (sem duração = 15). */
  plannedMinutes: number;
};

/**
 * Monta a sessão: mesmas candidatas da Agora, filtradas pela energia,
 * em ordem de prioridade (em andamento primeiro). Percorre a lista e
 * coloca cada tarefa que ainda cabe no tempo restante. Tarefa maior
 * que o tempo não entra.
 */
export function buildSession(tasks: Task[], { minutes, energy, today, skip }: SessionRequest): SessionPlan {
  const score = (t: Task) =>
    priorityScore(t, today) + (energy === "HIGH" && t.energy === "HIGH" ? SESSION_LIMITS.highEnergyBonus : 0);
  const tieBreak = comparePriority(today);

  const ranked = tasks
    .filter((t) => isAgoraCandidate(t, today) && fitsEnergy(t.energy, energy) && !skip?.has(t.id))
    .map((t) => ({ task: t, score: score(t) }))
    .sort((a, b) => {
      const progress = Number(b.task.status === "IN_PROGRESS") - Number(a.task.status === "IN_PROGRESS");
      return progress || b.score - a.score || tieBreak(a.task, b.task);
    });

  const picked: Task[] = [];
  let remaining = minutes;
  for (const { task } of ranked) {
    if (picked.length >= SESSION_LIMITS.maxTasks) break;
    const needed = sessionMinutes(task);
    if (needed > remaining) continue;
    picked.push(task);
    remaining -= needed;
  }

  return { tasks: picked, plannedMinutes: minutes - remaining };
}

/**
 * Sessão aberta continua valendo por até 3× o tempo escolhido (mínimo 1 h).
 * Depois disso é esquecida sem cobrança — ninguém precisa "encerrar" nada.
 */
export function isSessionActive(
  session: { startedAt: string; endedAt: string | null; availableMinutes: number },
  now: Date,
): boolean {
  if (session.endedAt) return false;
  const graceMs = Math.max(session.availableMinutes * 3, 60) * 60_000;
  return now.getTime() < Date.parse(session.startedAt) + graceMs;
}

/** Horário previsto de término: início + tempo escolhido. */
export function sessionEndsAt(session: { startedAt: string; availableMinutes: number }): Date {
  return new Date(Date.parse(session.startedAt) + session.availableMinutes * 60_000);
}
