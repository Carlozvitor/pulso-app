import { nowIn } from "@/lib/dates";
import { listEvents } from "@/lib/events/queries";
import { occurrencesBetween } from "@/lib/events/occurrences";
import { nextActionIn, openCounts } from "@/lib/origins/summary";
import { MODULES, originHref, originLabel } from "@/lib/origins/tree";
import { compareProjects, contextLabel } from "@/lib/projects/organize";
import { getContextLookup, listAreas, listProjects } from "@/lib/projects/queries";
import { listOpenTasks } from "@/lib/tasks/queries";
import { MODULE_KEYS, type ProjectSummary } from "@/types/project";
import type { Task, TaskSummary } from "@/types/task";
import { buildCentral, type CentralView } from "./central";

/** Quantos projetos aparecem em "Minha vida" ao lado de Trabalho e Compromissos (o resto fica em Projetos). */
const PROJECTS_ON_CENTRAL = 2;

/** Card de um módulo em "Minha vida" (só os que já têm página). */
export type ModuleCardData = { key: string; label: string; href: string; open: number; next: TaskSummary | null };

/** Card de Compromissos em "Minha vida": quantos hoje e o próximo que ainda não passou. */
export type AgendaCardData = { count: number; next: { time: string | null; title: string } | null };

export type CentralPage = {
  view: CentralView;
  modules: ModuleCardData[];
  agenda: AgendaCardData;
  projects: ProjectSummary[];
};

export async function getCentralPage(): Promise<CentralPage> {
  const [tasks, { groups }, areas, lookup, events] = await Promise.all([
    listOpenTasks(),
    listProjects(),
    listAreas(),
    getContextLookup(),
    listEvents(),
  ]);
  const active = groups.flatMap((g) => g.projects);
  const now = nowIn();
  const today = now.date;
  const areaLabel = (id: string | null) => (id ? originLabel(id, lookup.origins) : null);
  const todayEvents = occurrencesBetween(events, today, today, now);
  const nextEvent = todayEvents.find((o) => !o.past);
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
    view: buildCentral(tasks, active, today, contextOf, { events, now, areaLabel }),
    modules,
    agenda: { count: todayEvents.length, next: nextEvent ? { time: nextEvent.startTime, title: nextEvent.title } : null },
    projects: [...active].sort(compareProjects).slice(0, PROJECTS_ON_CENTRAL),
  };
}
