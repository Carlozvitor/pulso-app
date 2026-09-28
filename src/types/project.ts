export const PROJECT_STATUSES = ["ACTIVE", "DONE", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Responsabilidade contínua (Valentine, Faculdade, Pessoal…). */
export type Area = {
  id: string;
  name: string;
};

/** Objetivo com começo e fim. A área das tarefas vem daqui. */
export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  areaId: string | null;
  /** Data sem hora (YYYY-MM-DD). */
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type ProjectProgress = {
  done: number;
  total: number;
  /** 0–100, inteiro. Projeto sem tarefas = 0. */
  percent: number;
};

/** Linha da tela Projetos. */
export type ProjectSummary = Project & { progress: ProjectProgress };

/** Projetos agrupados por área, na ordem de exibição. `area` null = "Sem área". */
export type ProjectGroup<P extends Project = ProjectSummary> = { area: Area | null; projects: P[] };
