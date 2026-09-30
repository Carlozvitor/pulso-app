import { todayIn } from "@/lib/dates";
import { nextActionIn, openCounts } from "@/lib/origins/summary";
import { MODULES, originHref } from "@/lib/origins/tree";
import { compareProjects, contextLabel } from "@/lib/projects/organize";
import { getContextLookup, listAreas, listProjects } from "@/lib/projects/queries";
import { listOpenTasks } from "@/lib/tasks/queries";
import { MODULE_KEYS, type ProjectSummary } from "@/types/project";
import type { Task, TaskSummary } from "@/types/task";
import { buildCentral, type CentralView } from "./central";

/** Quantos projetos aparecem em "Minha vida" ao lado dos módulos (o resto fica em Projetos). */
const PROJECTS_ON_CENTRAL = 3;

/** Card de um módulo em "Minha vida" (só os que já têm página). */
export type ModuleCardData = { key: string; label: string; href: string; open: number; next: TaskSummary | null };

export type CentralPage = {
  view: CentralView;
  modules: ModuleCardData[];
  projects: ProjectSummary[];
};

export async function getCentralPage(): Promise<CentralPage> {
  const [tasks, { groups }, areas, lookup] = await Promise.all([listOpenTasks(), listProjects(), listAreas(), getContextLookup()]);
  const active = groups.flatMap((g) => g.projects);
  const today = todayIn();
  const contextOf = (t: Task) => contextLabel(t, lookup);
  const counts = openCounts(areas, tasks);

  const modules = MODULE_KEYS.flatMap((key): ModuleCardData[] => {
    const root = areas.find((a) => a.module === key && a.parentId === null);
    const href = root && originHref(root);
    if (!root || !href) return [];
    const next = nextActionIn(root.id, areas, tasks, today, contextOf);
    return [{ key, label: MODULES[key].label, href, open: counts.get(root.id) ?? 0, next }];
  });

  return {
    view: buildCentral(tasks, active, today, contextOf),
    modules,
    projects: [...active].sort(compareProjects).slice(0, PROJECTS_ON_CENTRAL),
  };
}
