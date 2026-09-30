import { nowIn } from "@/lib/dates";
import { listEvents } from "@/lib/events/queries";
import { occurrencesBetween } from "@/lib/events/occurrences";
import { attentionLabel, nextAttention } from "@/lib/faculdade/assessments";
import { listAssessments } from "@/lib/faculdade/queries";
import { nextActionIn, openCounts } from "@/lib/origins/summary";
import { MODULES, isArchived, originHref, originLabel } from "@/lib/origins/tree";
import { compareProjects, contextLabel } from "@/lib/projects/organize";
import { getContextLookup, listAreas, listProjects } from "@/lib/projects/queries";
import { listOpenTasks } from "@/lib/tasks/queries";
import { MODULE_KEYS, type ModuleKey, type ProjectSummary } from "@/types/project";
import type { Task, TaskSummary } from "@/types/task";
import { buildCentral, type CentralView } from "./central";

/** "Minha vida" fecha fileiras de 4 no PC: projetos completam o que sobra depois dos módulos e de Compromissos. */
const ROW = 4;

/** Card de um módulo em "Minha vida" (só os que já têm página). */
export type ModuleCardData = {
  key: ModuleKey;
  label: string;
  href: string;
  open: number;
  next: TaskSummary | null;
  /** Próxima atenção do módulo que não é tarefa (Faculdade: "Prova amanhã · 19:00"). */
  attention: string | null;
};

/** Card de Compromissos em "Minha vida": quantos hoje e o próximo que ainda não passou. */
export type AgendaCardData = { count: number; next: { time: string | null; title: string } | null };

export type CentralPage = {
  view: CentralView;
  modules: ModuleCardData[];
  agenda: AgendaCardData;
  projects: ProjectSummary[];
};

export async function getCentralPage(): Promise<CentralPage> {
  const [tasks, { groups }, areas, lookup, events, assessments] = await Promise.all([
    listOpenTasks(),
    listProjects(),
    listAreas(),
    getContextLookup(),
    listEvents(),
    listAssessments(),
  ]);
  const active = groups.flatMap((g) => g.projects);
  const now = nowIn();
  const today = now.date;
  const areaLabel = (id: string | null) => (id ? originLabel(id, lookup.origins) : null);
  const todayEvents = occurrencesBetween(events, today, today, now);
  const nextEvent = todayEvents.find((o) => !o.past);
  const contextOf = (t: Task) => contextLabel(t, lookup);
  const counts = openCounts(areas, tasks);
  // Disciplina encerrada sai da Central junto com as avaliações dela.
  const liveAssessments = assessments.filter((a) => !isArchived(a.areaId, lookup.origins));

  const modules = MODULE_KEYS.flatMap((key): ModuleCardData[] => {
    const root = areas.find((a) => a.module === key && a.parentId === null);
    const href = root && originHref(root);
    if (!root || !href) return [];
    const next = nextActionIn(root.id, areas, tasks, today, contextOf);
    const upcoming = key === "FACULDADE" ? nextAttention(liveAssessments, today) : null;
    return [
      {
        key,
        label: MODULES[key].label,
        href,
        open: counts.get(root.id) ?? 0,
        next,
        attention: upcoming ? attentionLabel(upcoming, today) : null,
      },
    ];
  });
  const projectSlots = (ROW - ((modules.length + 1) % ROW)) % ROW;

  return {
    view: buildCentral(tasks, active, today, contextOf, { events, now, areaLabel, assessments: liveAssessments }),
    modules,
    agenda: { count: todayEvents.length, next: nextEvent ? { time: nextEvent.startTime, title: nextEvent.title } : null },
    projects: [...active].sort(compareProjects).slice(0, projectSlots),
  };
}
