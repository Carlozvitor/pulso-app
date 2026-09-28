import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { comparePriority } from "@/lib/priorities/score";
import { todayIn } from "@/lib/dates";
import { TASK_COLUMNS, taskRowSchema } from "@/lib/tasks/schemas";
import type { Area, Project, ProjectGroup, ProjectProgress, ProjectSummary } from "@/types/project";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/task";
import { groupProjects, projectProgress, type ContextLookup } from "./organize";
import { PROJECT_COLUMNS, areaRowSchema, idSchema, projectRowSchema } from "./schemas";

const areaRows = z.array(areaRowSchema);
const projectRows = z.array(projectRowSchema);
const taskRows = z.array(taskRowSchema);
const namedRows = z.array(z.object({ id: z.string(), name: z.string() }));
const statusRows = z.array(z.object({ project_id: z.string(), status: z.enum(TASK_STATUSES) }));

export async function listAreas(): Promise<Area[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("areas").select("id, name").order("name");
  if (error) throw error;
  return areaRows.parse(data);
}

/** Tela Projetos: ativos agrupados por área + concluídos/arquivados à parte. */
export async function listProjects(): Promise<{ groups: ProjectGroup[]; finished: ProjectSummary[] }> {
  const { supabase } = await requireUser();
  const [projects, areas, statuses] = await Promise.all([
    supabase.from("projects").select(PROJECT_COLUMNS),
    supabase.from("areas").select("id, name"),
    supabase.from("tasks").select("project_id, status").not("project_id", "is", null),
  ]);
  if (projects.error) throw projects.error;
  if (areas.error) throw areas.error;
  if (statuses.error) throw statuses.error;

  const byProject = new Map<string, TaskStatus[]>();
  for (const row of statusRows.parse(statuses.data)) {
    byProject.set(row.project_id, [...(byProject.get(row.project_id) ?? []), row.status]);
  }
  const summaries = projectRows
    .parse(projects.data)
    .map((p): ProjectSummary => ({ ...p, progress: projectProgress(byProject.get(p.id) ?? []) }));

  return {
    groups: groupProjects(
      summaries.filter((p) => p.status === "ACTIVE"),
      areaRows.parse(areas.data),
    ),
    finished: summaries
      .filter((p) => p.status !== "ACTIVE")
      .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt)),
  };
}

export type ProjectDetail = {
  project: Project;
  areas: Area[];
  progress: ProjectProgress;
  /** Tarefas abertas, na ordem de prioridade. */
  openTasks: Task[];
};

export async function getProject(id: string): Promise<ProjectDetail | null> {
  if (!idSchema.safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const [project, areas, tasks] = await Promise.all([
    supabase.from("projects").select(PROJECT_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("areas").select("id, name").order("name"),
    supabase.from("tasks").select(TASK_COLUMNS).eq("project_id", id),
  ]);
  if (project.error) throw project.error;
  if (areas.error) throw areas.error;
  if (tasks.error) throw tasks.error;
  if (!project.data) return null;

  const all = taskRows.parse(tasks.data);
  const open = new Set<TaskStatus>(["INBOX", "TODO", "IN_PROGRESS"]);
  return {
    project: projectRowSchema.parse(project.data),
    areas: areaRows.parse(areas.data),
    progress: projectProgress(all.map((t) => t.status)),
    openTasks: all.filter((t) => open.has(t.status)).sort(comparePriority(todayIn())),
  };
}

/** Para escolher projeto/área numa tarefa. Vêm todos: a tarefa pode estar num projeto já concluído. */
export async function getAssignOptions(): Promise<{ areas: Area[]; projects: Project[] }> {
  const { supabase } = await requireUser();
  const [areas, projects] = await Promise.all([
    supabase.from("areas").select("id, name").order("name"),
    supabase.from("projects").select(PROJECT_COLUMNS).order("name"),
  ]);
  if (areas.error) throw areas.error;
  if (projects.error) throw projects.error;
  return { areas: areaRows.parse(areas.data), projects: projectRows.parse(projects.data) };
}

/** Nomes de todos os projetos e áreas — para rotular tarefas nas listas. */
export async function getContextLookup(): Promise<ContextLookup> {
  const { supabase } = await requireUser();
  const [areas, projects] = await Promise.all([
    supabase.from("areas").select("id, name"),
    supabase.from("projects").select("id, name"),
  ]);
  if (areas.error) throw areas.error;
  if (projects.error) throw projects.error;
  return {
    areas: new Map(areaRows.parse(areas.data).map((a) => [a.id, a.name])),
    projects: new Map(namedRows.parse(projects.data).map((p) => [p.id, p.name])),
  };
}
