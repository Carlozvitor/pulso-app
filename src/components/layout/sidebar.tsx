import { compareProjects, projectMonogram } from "@/lib/projects/organize";
import { listProjects } from "@/lib/projects/queries";
import { countInbox, countTodo } from "@/lib/tasks/queries";
import { getModuleNav } from "@/lib/origins/queries";
import { SidebarNav, type SidebarModule, type SidebarProject } from "./sidebar-nav";

/** Barra lateral do PC: a navegação do Hub, fixa na altura da tela. */
export async function Sidebar() {
  const [{ groups }, workNav, inboxCount, todoCount] = await Promise.all([
    listProjects(),
    getModuleNav("TRABALHO"),
    countInbox(),
    countTodo(),
  ]);
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

  return <SidebarView projects={projects} work={work} inboxCount={inboxCount} todoCount={todoCount} />;
}

export function SidebarView({
  projects,
  work,
  inboxCount,
  todoCount,
}: {
  projects: SidebarProject[];
  work: SidebarModule;
  inboxCount: number;
  todoCount: number;
}) {
  return (
    <aside className="sticky top-topbar hidden h-[calc(100dvh-var(--topbar-height)-0.75rem)] lg:grid">
      <SidebarNav projects={projects} work={work} inboxCount={inboxCount} todoCount={todoCount} />
    </aside>
  );
}
