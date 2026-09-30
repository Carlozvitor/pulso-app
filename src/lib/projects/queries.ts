import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { comparePriority } from "@/lib/priorities/score";
import { todayIn } from "@/lib/dates";
import { TASK_COLUMNS, taskRowSchema } from "@/lib/tasks/schemas";
import type { Area, AreaLink, Project, ProjectLists, ProjectSummary } from "@/types/project";
import type { Task, TaskStatus } from "@/types/task";
import { splitProjects, summarizeProjects, type ContextLookup } from "./organize";
import { AREA_COLUMNS, PROJECT_COLUMNS, areaLinkRowSchema, areaRowSchema, idSchema, projectRowSchema } from "./schemas";
import { indexOrigins } from "@/lib/origins/tree";

const areaRows = z.array(areaRowSchema);
const projectRows = z.array(projectRowSchema);
const taskRows = z.array(taskRowSchema);
const linkRows = z.array(areaLinkRowSchema);
const idRows = z.array(z.object({ id: z.string() }));
const namedRows = z.array(z.object({ id: z.string(), name: z.string() }));
const titledRows = z.array(z.object({ id: z.string(), title: z.string() }));
const assessmentRefRows = z.array(z.object({ id: z.string(), title: z.string(), area_id: z.string() }));
const notesRow = z.object({ notes: z.string().nullable(), notes_updated_at: z.string().nullable() });

export const listAreas = cache(async function listAreas(): Promise<Area[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("areas").select(AREA_COLUMNS).order("name");
  if (error) throw error;
  return areaRows.parse(data);
});

/**
 * Projetos pausados: as ações deles ficam guardadas — fora da Agora, do A fazer, da Central
 * e da sessão — até retomar. Em cache por requisição (todas as listas de ações leem daqui).
 */
export const listPausedProjectIds = cache(async function listPausedProjectIds(): Promise<Set<string>> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("projects").select("id").eq("status", "PAUSED");
  if (error) throw error;
  return new Set(idRows.parse(data).map((r) => r.id));
});

/** Tela Projetos (e barra lateral, Central): todos, separados pelas abas. */
export const listProjects = cache(async function listProjects(): Promise<ProjectLists> {
  const { supabase } = await requireUser();
  const [projects, areas, tasks] = await Promise.all([
    supabase.from("projects").select(PROJECT_COLUMNS),
    supabase.from("areas").select(AREA_COLUMNS),
    // Arquivadas não contam no progresso; as outras dão o progresso e a próxima ação.
    supabase.from("tasks").select(TASK_COLUMNS).not("project_id", "is", null).neq("status", "ARCHIVED"),
  ]);
  if (projects.error) throw projects.error;
  if (areas.error) throw areas.error;
  if (tasks.error) throw tasks.error;

  const summaries = summarizeProjects(projectRows.parse(projects.data), taskRows.parse(tasks.data), areaRows.parse(areas.data), todayIn());
  return splitProjects(summaries);
});

/** Quantas concluídas aparecem em "feitas" na página do projeto. */
const DONE_ON_PROJECT = 20;

export type ProjectDetail = {
  project: ProjectSummary;
  areas: Area[];
  notes: string | null;
  notesUpdatedAt: string | null;
  links: AreaLink[];
  /** Tarefas abertas, na ordem de prioridade. */
  openTasks: Task[];
  /** Concluídas, da mais recente para a mais antiga (no máximo DONE_ON_PROJECT). */
  doneTasks: Task[];
  doneCount: number;
};

export async function getProject(id: string): Promise<ProjectDetail | null> {
  if (!idSchema.safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const [project, areas, tasks, links] = await Promise.all([
    supabase.from("projects").select(`${PROJECT_COLUMNS}, notes, notes_updated_at`).eq("id", id).maybeSingle(),
    supabase.from("areas").select(AREA_COLUMNS).order("name"),
    supabase.from("tasks").select(TASK_COLUMNS).eq("project_id", id),
    supabase.from("project_links").select("id, title, url").eq("project_id", id).order("created_at"),
  ]);
  if (project.error) throw project.error;
  if (areas.error) throw areas.error;
  if (tasks.error) throw tasks.error;
  if (links.error) throw links.error;
  if (!project.data) return null;

  const today = todayIn();
  const all = taskRows.parse(tasks.data);
  const parsedAreas = areaRows.parse(areas.data);
  const [summary] = summarizeProjects([projectRowSchema.parse(project.data)], all, parsedAreas, today);
  const open = new Set<TaskStatus>(["INBOX", "TODO", "IN_PROGRESS"]);
  const done = all
    .filter((t) => t.status === "DONE")
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
  const { notes: text, notes_updated_at } = notesRow.parse(project.data);
  return {
    project: summary,
    areas: parsedAreas,
    notes: text,
    notesUpdatedAt: notes_updated_at,
    links: linkRows.parse(links.data),
    openTasks: all.filter((t) => open.has(t.status)).sort(comparePriority(today)),
    doneTasks: done.slice(0, DONE_ON_PROJECT),
    doneCount: done.length,
  };
}

/** Avaliação a que uma tarefa pode estar ligada (só o que a tela da tarefa precisa). */
export type AssessmentRef = { id: string; title: string; areaId: string };

/** Para escolher projeto/área numa tarefa. Vêm todos: a tarefa pode estar num projeto já concluído. */
export async function getAssignOptions(): Promise<{ areas: Area[]; projects: Project[]; assessments: AssessmentRef[] }> {
  const { supabase } = await requireUser();
  const [areas, projects, assessments] = await Promise.all([
    supabase.from("areas").select(AREA_COLUMNS).order("name"),
    supabase.from("projects").select(PROJECT_COLUMNS).order("name"),
    supabase.from("assessments").select("id, title, area_id"),
  ]);
  if (areas.error) throw areas.error;
  if (projects.error) throw projects.error;
  if (assessments.error) throw assessments.error;
  return {
    areas: areaRows.parse(areas.data),
    projects: projectRows.parse(projects.data),
    assessments: assessmentRefRows.parse(assessments.data).map((a) => ({ id: a.id, title: a.title, areaId: a.area_id })),
  };
}

/** Nomes de todos os projetos, a árvore de origens e as avaliações — para rotular tarefas nas listas. */
export const getContextLookup = cache(async function getContextLookup(): Promise<ContextLookup> {
  const { supabase } = await requireUser();
  const [areas, projects, assessments] = await Promise.all([
    supabase.from("areas").select(AREA_COLUMNS),
    supabase.from("projects").select("id, name"),
    supabase.from("assessments").select("id, title"),
  ]);
  if (areas.error) throw areas.error;
  if (projects.error) throw projects.error;
  if (assessments.error) throw assessments.error;
  return {
    origins: indexOrigins(areaRows.parse(areas.data)),
    projects: new Map(namedRows.parse(projects.data).map((p) => [p.id, p.name])),
    assessments: new Map(titledRows.parse(assessments.data).map((a) => [a.id, a.title])),
  };
});
