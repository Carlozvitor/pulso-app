import type { Area, Project, ProjectGroup, ProjectLists, ProjectProgress, ProjectSummary } from "@/types/project";
import type { Task, TaskStatus } from "@/types/task";
import { isAgoraCandidate } from "@/lib/priorities/agora";
import { comparePriority } from "@/lib/priorities/score";
import { indexOrigins, originFullLabel, originLabel, type OriginIndex } from "@/lib/origins/tree";

/** Concluídas ÷ total. Arquivadas não contam — saíram do escopo do projeto. */
export function projectProgress(statuses: TaskStatus[]): ProjectProgress {
  const counted = statuses.filter((s) => s !== "ARCHIVED");
  const done = counted.filter((s) => s === "DONE").length;
  const total = counted.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "pt-BR");

/** Prazo mais cedo primeiro; sem prazo depois; empate pelo nome. */
export function compareProjects(a: Project, b: Project): number {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return byName(a, b);
}

/** Tira as ações dos projetos pausados (ficam guardadas até retomar). */
export function withoutPausedProjects<T extends Pick<Task, "projectId">>(tasks: T[], paused: Set<string>): T[] {
  return paused.size === 0 ? tasks : tasks.filter((t) => !t.projectId || !paused.has(t.projectId));
}

/** A próxima ação de um projeto: a primeira que a Agora mostraria (as do próprio projeto). */
export function nextProjectAction(tasks: Task[], today: string): Task | null {
  const [next] = tasks.filter((t) => isAgoraCandidate(t, today)).sort(comparePriority(today));
  return next ?? null;
}

/**
 * Card de cada projeto: progresso pelas tarefas (arquivadas não contam), caminho da origem
 * e a próxima ação — esta só para projeto em andamento (pausado guarda as ações).
 */
export function summarizeProjects(projects: Project[], tasks: Task[], areas: Area[], today: string): ProjectSummary[] {
  const index = indexOrigins(areas);
  const byProject = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.projectId) byProject.set(task.projectId, [...(byProject.get(task.projectId) ?? []), task]);
  }
  return projects.map((project) => {
    const own = byProject.get(project.id) ?? [];
    const next = project.status === "ACTIVE" ? nextProjectAction(own, today) : null;
    const origin = project.areaId ? index.get(project.areaId) : undefined;
    return {
      ...project,
      progress: projectProgress(own.map((t) => t.status)),
      origin: origin ? originFullLabel(origin.id, index) : null,
      originModule: origin?.module ?? null,
      next: next ? { id: next.id, title: next.title } : null,
    };
  });
}

/** Mais recente primeiro (pela data dada; sem ela, pela criação). */
const newestBy =
  <P extends Project>(when: (p: P) => string | null) =>
  (a: P, b: P) =>
    (when(b) ?? b.createdAt).localeCompare(when(a) ?? a.createdAt);

/**
 * As abas da tela Projetos: em andamento pelo prazo (mais perto primeiro), pausados pela
 * pausa mais recente, concluídos e arquivados pelo fim mais recente.
 */
export function splitProjects<P extends Project>(projects: P[]): { [K in keyof ProjectLists]: P[] } {
  const only = (status: Project["status"]) => projects.filter((p) => p.status === status);
  return {
    active: only("ACTIVE").sort(compareProjects),
    paused: only("PAUSED").sort(newestBy<P>((p) => p.pausedAt)),
    done: only("DONE").sort(newestBy<P>((p) => p.completedAt)),
    archived: only("ARCHIVED").sort(newestBy<P>((p) => p.completedAt)),
  };
}

/** Rótulo do grupo de projetos sem origem. */
export const NO_ORIGIN_LABEL = "Sem origem";

/**
 * Agrupa por origem (rótulo do caminho, em ordem alfabética; "Sem origem" no fim).
 * Origens sem projeto não aparecem.
 */
export function groupProjects<P extends Project>(projects: P[], areas: Area[]): ProjectGroup<P>[] {
  const index = indexOrigins(areas);
  const groups: ProjectGroup<P>[] = areas
    .map((area) => ({
      area,
      label: originLabel(area.id, index) ?? area.name,
      projects: projects.filter((p) => p.areaId === area.id).sort(compareProjects),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  groups.push({
    area: null,
    label: NO_ORIGIN_LABEL,
    projects: projects.filter((p) => !p.areaId || !index.has(p.areaId)).sort(compareProjects),
  });
  return groups.filter((g) => g.projects.length > 0);
}

/** Nomes dos projetos, a árvore de origens e os títulos das avaliações — para rotular tarefas nas listas. */
export type ContextLookup = {
  projects: Map<string, string>;
  origins: OriginIndex;
  assessments: Map<string, string>;
};

type Labeled = Pick<Task, "projectId" | "areaId"> & Partial<Pick<Task, "assessmentId">>;

/**
 * "CRUMB CLUB" quando há projeto; senão o caminho da origem ("Valentine → Conteúdo"), com a
 * avaliação quando a ação serve a uma ("Marketing Digital · Trabalho final"); senão nada.
 * `from`: rótulo relativo a uma origem acima (na página dela, não repete o próprio caminho).
 */
export function contextLabel(task: Labeled, lookup: ContextLookup, from?: string): string | null {
  if (task.projectId) {
    const project = lookup.projects.get(task.projectId);
    if (project) return project;
  }
  const origin = task.areaId ? originLabel(task.areaId, lookup.origins, from) : null;
  const assessment = task.assessmentId ? lookup.assessments.get(task.assessmentId) : undefined;
  return [origin, assessment].filter(Boolean).join(" · ") || null;
}

/** Iniciais para o selo do projeto: "CRUMB CLUB" → "CC", "PORTFÓLIO" → "PO". */
export function projectMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toLocaleUpperCase("pt-BR");
}
