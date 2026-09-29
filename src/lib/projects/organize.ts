import type { Area, Project, ProjectGroup, ProjectProgress } from "@/types/project";
import type { Task, TaskStatus } from "@/types/task";

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

/**
 * Agrupa por área (ordem alfabética, "Sem área" no fim). Áreas sem projeto não aparecem.
 */
export function groupProjects<P extends Project>(projects: P[], areas: Area[]): ProjectGroup<P>[] {
  const known = new Set(areas.map((a) => a.id));
  const groups: ProjectGroup<P>[] = [...areas].sort(byName).map((area) => ({
    area,
    projects: projects.filter((p) => p.areaId === area.id).sort(compareProjects),
  }));
  groups.push({
    area: null,
    projects: projects.filter((p) => !p.areaId || !known.has(p.areaId)).sort(compareProjects),
  });
  return groups.filter((g) => g.projects.length > 0);
}

/** Nomes de projetos e áreas por id — para rotular tarefas nas listas. */
export type ContextLookup = {
  projects: Map<string, string>;
  areas: Map<string, string>;
};

/** "CRUMB CLUB" quando há projeto; senão o nome da área; senão nada. */
export function contextLabel(task: Pick<Task, "projectId" | "areaId">, lookup: ContextLookup): string | null {
  if (task.projectId) {
    const project = lookup.projects.get(task.projectId);
    if (project) return project;
  }
  return (task.areaId && lookup.areas.get(task.areaId)) || null;
}

/** Iniciais para o selo do projeto: "CRUMB CLUB" → "CC", "PORTFÓLIO" → "PO". */
export function projectMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toLocaleUpperCase("pt-BR");
}
