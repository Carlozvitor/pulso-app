export const TASK_STATUSES = ["INBOX", "TODO", "IN_PROGRESS", "DONE", "ARCHIVED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ENERGY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Energy = (typeof ENERGY_LEVELS)[number];

/** Escala interna 0–5 (importância e urgência). */
export type Scale = 0 | 1 | 2 | 3 | 4 | 5;

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  importance: Scale | null;
  urgency: Scale | null;
  energy: Energy | null;
  estimatedMinutes: number | null;
  /** Data sem hora (YYYY-MM-DD), no fuso do usuário. */
  dueDate: string | null;
  projectId: string | null;
  areaId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

/** O mínimo que uma linha de tarefa precisa para ser exibida. */
export type TaskSummary = {
  id: string;
  title: string;
  /** Nome do projeto ou da área, quando houver. */
  context: string | null;
  estimatedMinutes: number | null;
};

/** O que a tela Agora mostra — já priorizado e limitado. */
export type AgoraView = {
  pendingCount: number;
  now: TaskSummary | null;
  next: TaskSummary[];
  later: TaskSummary[];
};
