/** Em andamento · Pausado (guardado, volta ao retomar) · Concluído · Arquivado. */
export const PROJECT_STATUSES = ["ACTIVE", "PAUSED", "DONE", "ARCHIVED"] as const;
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
  /** Encerrado (disciplina de semestre passado): fica guardado, fora do seletor e da Central. */
  archivedAt: string | null;
};

/** Link de contexto (de uma origem ou de um projeto). */
export type AreaLink = { id: string; title: string; url: string };

/** Trabalho maior, com começo e fim. A origem das tarefas vem daqui. */
export type Project = {
  id: string;
  name: string;
  /** O objetivo do projeto (na tela, "Objetivo"). */
  description: string | null;
  status: ProjectStatus;
  areaId: string | null;
  /** Data sem hora (YYYY-MM-DD). */
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  /** Quando foi pausado (só enquanto estiver pausado). */
  pausedAt: string | null;
};

export type ProjectProgress = {
  done: number;
  total: number;
  /** 0–100, inteiro. Projeto sem tarefas = 0. */
  percent: number;
};

/** Card/linha da tela Projetos. */
export type ProjectSummary = Project & {
  progress: ProjectProgress;
  /** Caminho da origem ("Trabalho → Clientes / Freelance"); null = sem origem. */
  origin: string | null;
  /** Módulo da origem, para o ícone ao lado do caminho. */
  originModule: ModuleKey | null;
  /** A primeira ação pela prioridade — a que a Agora mostraria. Só em projeto em andamento. */
  next: { id: string; title: string } | null;
};

/** Projetos separados pelas abas da tela, cada lista já na ordem de exibição. */
export type ProjectLists = {
  active: ProjectSummary[];
  paused: ProjectSummary[];
  done: ProjectSummary[];
  archived: ProjectSummary[];
};

/** Projetos agrupados por origem, na ordem de exibição. `area` null = "Sem origem". */
export type ProjectGroup<P extends Project = ProjectSummary> = { area: Area | null; label: string; projects: P[] };
