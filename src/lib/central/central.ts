import type { ProjectProgress, ProjectSummary } from "@/types/project";
import type { AgoraView, Task } from "@/types/task";
import { addDays } from "@/lib/dates";
import { buildAgoraView, type ContextOf } from "@/lib/priorities/agora";
import { comparePriority } from "@/lib/priorities/score";

/** Central: 1 agora + 2 depois; Hoje e Próximas atenções mostram até 6 cada. */
export const CENTRAL_LIMITS = { next: 2, today: 6, upcoming: 6 } as const;

/** Até quantos dias à frente algo vira "Próxima atenção". */
export const UPCOMING_DAYS = 7;

const OPEN = new Set<Task["status"]>(["INBOX", "TODO", "IN_PROGRESS"]);

/** Uma linha de Hoje ou de Próximas atenções: prazo de tarefa ou de projeto. */
export type AttentionItem =
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
  /** Prazos de hoje — inclui o que já passou ("Era pra …"). */
  todayList: AttentionList;
  /** Prazos de amanhã até 7 dias. */
  upcoming: AttentionList;
};

/**
 * Ordem das linhas: data mais cedo primeiro; no mesmo dia, tarefas (por prioridade)
 * antes de projetos (por nome).
 */
function sortItems(items: AttentionItem[], taskRank: Map<string, number>): AttentionItem[] {
  return items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind !== b.kind) return a.kind === "task" ? -1 : 1;
    if (a.kind === "task") return (taskRank.get(a.id) ?? 0) - (taskRank.get(b.id) ?? 0);
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

function limit(items: AttentionItem[], max: number): AttentionList {
  return { items: items.slice(0, max), more: Math.max(0, items.length - max) };
}

/**
 * A síntese da Central: o que fazer agora (do motor da Agora), o que tem prazo hoje
 * e o que vem nos próximos dias. Só projetos ativos com prazo entram.
 */
export function buildCentral(
  tasks: Task[],
  projects: ProjectSummary[],
  today: string,
  contextOf: ContextOf = () => null,
): CentralView {
  const agora = buildAgoraView(tasks, today, contextOf);
  const horizon = addDays(today, UPCOMING_DAYS);

  const dated = tasks
    .filter((t): t is Task & { dueDate: string } => OPEN.has(t.status) && t.dueDate !== null)
    .sort(comparePriority(today));
  const taskRank = new Map(dated.map((t, i) => [t.id, i]));

  const items: AttentionItem[] = [
    ...dated.map((t): AttentionItem => ({ kind: "task", id: t.id, title: t.title, context: contextOf(t), date: t.dueDate })),
    ...projects
      .filter((p): p is ProjectSummary & { dueDate: string } => p.status === "ACTIVE" && p.dueDate !== null)
      .map((p): AttentionItem => ({ kind: "project", id: p.id, title: p.name, date: p.dueDate, progress: p.progress })),
  ];
  const sorted = sortItems(items, taskRank);

  return {
    today,
    pendingCount: agora.pendingCount,
    now: agora.now,
    next: agora.next.slice(0, CENTRAL_LIMITS.next),
    todayList: limit(sorted.filter((i) => i.date <= today), CENTRAL_LIMITS.today),
    upcoming: limit(sorted.filter((i) => i.date > today && i.date <= horizon), CENTRAL_LIMITS.upcoming),
  };
}
