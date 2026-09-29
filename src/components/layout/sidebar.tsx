import { compareProjects, projectMonogram } from "@/lib/projects/organize";
import { listAreas, listProjects } from "@/lib/projects/queries";
import { countInbox, countTodo } from "@/lib/tasks/queries";
import { SidebarNav, type SidebarArea, type SidebarProject } from "./sidebar-nav";

/** Barra lateral do PC: o painel "Organização", fixo na altura da tela. */
export async function Sidebar() {
  const [{ groups }, areas, inboxCount, todoCount] = await Promise.all([
    listProjects(),
    listAreas(),
    countInbox(),
    countTodo(),
  ]);

  const projects: SidebarProject[] = groups
    .flatMap((group) => group.projects.map((project) => ({ project, areaName: group.area?.name ?? null })))
    .sort((a, b) => compareProjects(a.project, b.project))
    .map(({ project, areaName }) => ({
      id: project.id,
      name: project.name,
      monogram: projectMonogram(project.name),
      areaName,
      open: project.progress.total - project.progress.done,
    }));

  return <SidebarView projects={projects} areas={areas} inboxCount={inboxCount} todoCount={todoCount} />;
}

export function SidebarView({
  projects,
  areas,
  inboxCount,
  todoCount,
}: {
  projects: SidebarProject[];
  areas: SidebarArea[];
  inboxCount: number;
  todoCount: number;
}) {
  return (
    <aside className="sticky top-topbar hidden h-[calc(100dvh-var(--topbar-height)-0.75rem)] lg:grid">
      <SidebarNav projects={projects} areas={areas} inboxCount={inboxCount} todoCount={todoCount} />
    </aside>
  );
}
