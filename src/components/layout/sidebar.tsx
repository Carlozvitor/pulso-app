import { compareProjects, projectMonogram } from "@/lib/projects/organize";
import { listProjects } from "@/lib/projects/queries";
import { countInbox, countTodo } from "@/lib/tasks/queries";
import { cookies } from "next/headers";
import { getTodaySummary } from "@/lib/events/queries";
import { getModuleNav } from "@/lib/origins/queries";
import { SIDEBAR_COMPACT, SIDEBAR_COOKIE } from "./sidebar-state";
import { SidebarNav, type SidebarAgenda, type SidebarModule, type SidebarProject } from "./sidebar-nav";

/** Barra lateral do PC: a navegação do Hub, fixa na altura da tela. */
export async function Sidebar() {
  const [{ groups }, workNav, agenda, inboxCount, todoCount, jar] = await Promise.all([
    listProjects(),
    getModuleNav("TRABALHO"),
    getTodaySummary(),
    countInbox(),
    countTodo(),
    cookies(),
  ]);
  const compact = jar.get(SIDEBAR_COOKIE)?.value === SIDEBAR_COMPACT;
  const work: SidebarModule = { areas: workNav.areas, open: Object.fromEntries(workNav.counts) };

  const projects: SidebarProject[] = groups
    .flatMap((group) => group.projects)
    .sort(compareProjects)
    .map((project) => ({
      id: project.id,
      name: project.name,
      monogram: projectMonogram(project.name),
      open: project.progress.total - project.progress.done,
    }));

  return <SidebarView projects={projects} work={work} agenda={agenda} inboxCount={inboxCount} todoCount={todoCount} compact={compact} />;
}

export function SidebarView({
  projects,
  work,
  agenda,
  inboxCount,
  todoCount,
  compact,
}: {
  projects: SidebarProject[];
  work: SidebarModule;
  agenda: SidebarAgenda;
  inboxCount: number;
  todoCount: number;
  compact: boolean;
}) {
  return (
    <aside className="sticky top-topbar hidden h-[calc(100dvh-var(--topbar-height)-0.75rem)] lg:grid">
      <SidebarNav projects={projects} work={work} agenda={agenda} inboxCount={inboxCount} todoCount={todoCount} initialCompact={compact} />
    </aside>
  );
}
