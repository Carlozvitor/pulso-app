export const PROJECT_STATUSES = ["ACTIVE", "DONE", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const MODULE_KEYS = ["TRABALHO", "FACULDADE", "DINHEIRO", "TREINO", "VIDA_PESSOAL"] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

/**
 * Origem (tabela `areas`): um lugar na árvore de um módulo — Trabalho → Valentine → Conteúdo.
 * A raiz (`parentId` null) é o próprio módulo. Tarefas e projetos apontam para cá (`areaId`).
 */
export type Area = {
  id: string;
  name: string;
  parentId: string | null;
  module: ModuleKey;
  position: number;
};

/** Contexto de uma origem: anotação livre e links. */
export type AreaLink = { id: string; title: string; url: string };

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

/** Projetos agrupados por origem, na ordem de exibição. `area` null = "Sem origem". */
export type ProjectGroup<P extends Project = ProjectSummary> = { area: Area | null; label: string; projects: P[] };
