import { todayIn } from "@/lib/dates";
import { compareProjects, contextLabel } from "@/lib/projects/organize";
import { getContextLookup, listProjects } from "@/lib/projects/queries";
import { listOpenTasks } from "@/lib/tasks/queries";
import type { ProjectSummary } from "@/types/project";
import type { Task } from "@/types/task";
import { buildCentral, type CentralView } from "./central";

/** Quantos projetos aparecem em "Minha vida" (o resto fica em Projetos). */
const PROJECTS_ON_CENTRAL = 4;

export type CentralPage = {
  view: CentralView;
  projects: ProjectSummary[];
};

export async function getCentralPage(): Promise<CentralPage> {
  const [tasks, { groups }, lookup] = await Promise.all([listOpenTasks(), listProjects(), getContextLookup()]);
  const active = groups.flatMap((g) => g.projects);
  return {
    view: buildCentral(tasks, active, todayIn(), (t: Task) => contextLabel(t, lookup)),
    projects: [...active].sort(compareProjects).slice(0, PROJECTS_ON_CENTRAL),
  };
}
