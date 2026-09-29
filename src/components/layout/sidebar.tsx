import { compareProjects, projectMonogram } from "@/lib/projects/organize";
import { listProjects } from "@/lib/projects/queries";
import { countInbox, countTodo } from "@/lib/tasks/queries";
import { SidebarNav, type SidebarProject } from "./sidebar-nav";

/** Barra lateral do PC: a navegação do Hub, fixa na altura da tela. */
export async function Sidebar() {
  const [{ groups }, inboxCount, todoCount] = await Promise.all([listProjects(), countInbox(), countTodo()]);

  const projects: SidebarProject[] = groups
    .flatMap((group) => group.projects)
    .sort(compareProjects)
    .map((project) => ({
      id: project.id,
      name: project.name,
      monogram: projectMonogram(project.name),
      open: project.progress.total - project.progress.done,
    }));

  return <SidebarView projects={projects} inboxCount={inboxCount} todoCount={todoCount} />;
}

export function SidebarView({
  projects,
  inboxCount,
  todoCount,
}: {
  projects: SidebarProject[];
  inboxCount: number;
  todoCount: number;
}) {
  return (
    <aside className="sticky top-topbar hidden h-[calc(100dvh-var(--topbar-height)-0.75rem)] lg:grid">
      <SidebarNav projects={projects} inboxCount={inboxCount} todoCount={todoCount} />
    </aside>
  );
}
