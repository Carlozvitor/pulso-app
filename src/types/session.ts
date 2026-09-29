import type { Energy, TaskStatus, TaskSummary } from "./task";

/** O que a pessoa escolheu: quanto tempo tem e como está de energia. */
export type SessionChoice = { minutes: number; energy: Energy };

/** Proposta antes de começar — nada salvo ainda. */
export type SessionProposal = SessionChoice & {
  tasks: TaskSummary[];
  plannedMinutes: number;
  /** Ids recusados com "Agora não" (vão na URL). */
  skipped: string[];
};

/** Sessão em andamento (salva no banco). */
export type ActiveSession = {
  id: string;
  availableMinutes: number;
  energy: Energy;
  /** ISO — horário previsto de término. */
  endsAt: string;
  tasks: (TaskSummary & { status: TaskStatus })[];
};
