import { compareProjects, projectMonogram } from "@/lib/projects/organize";
import { listProjects } from "@/lib/projects/queries";
import { countInbox, countTodo } from "@/lib/tasks/queries";
import { getTodaySummary } from "@/lib/events/queries";
import { getDinheiroNav } from "@/lib/dinheiro/pages";
import { getFaculdadeNav } from "@/lib/faculdade/pages";
import { getModuleNav } from "@/lib/origins/queries";
import { SidebarNav, type SidebarAgenda, type SidebarModule, type SidebarMoney, type SidebarProject } from "./sidebar-nav";

/** Barra lateral do PC: a navegação do Hub, fixa na altura da tela. */
export async function Sidebar() {
  const [{ groups }, workNav, schoolNav, money, agenda, inboxCount, todoCount] = await Promise.all([
    listProjects(),
    getModuleNav("TRABALHO"),
    getFaculdadeNav(),
    getDinheiroNav(),
    getTodaySummary(),
    countInbox(),
    countTodo(),
  ]);
  const work: SidebarModule = { areas: workNav.areas, open: Object.fromEntries(workNav.counts) };
  const school: SidebarModule | null = schoolNav
    ? { areas: schoolNav.areas, open: Object.fromEntries(schoolNav.counts), attention: schoolNav.attention }
    : null;

  const projects: SidebarProject[] = groups
    .flatMap((group) => group.projects)
    .sort(compareProjects)
    .map((project) => ({
      id: project.id,
      name: project.name,
      monogram: projectMonogram(project.name),
      open: project.progress.total - project.progress.done,
    }));

  return (
    <SidebarView projects={projects} work={work} school={school} money={money} agenda={agenda} inboxCount={inboxCount} todoCount={todoCount} />
  );
}

export function SidebarView({
  projects,
  work,
  school,
  money,
  agenda,
  inboxCount,
  todoCount,
}: {
  projects: SidebarProject[];
  work: SidebarModule;
  school: SidebarModule | null;
  money: SidebarMoney | null;
  agenda: SidebarAgenda;
  inboxCount: number;
  todoCount: number;
}) {
  return (
    <aside className="sticky top-topbar hidden h-[calc(100dvh-var(--topbar-height)-0.75rem)] lg:grid">
      <SidebarNav
        projects={projects}
        work={work}
        school={school}
        money={money}
        agenda={agenda}
        inboxCount={inboxCount}
        todoCount={todoCount}
      />
    </aside>
  );
}
