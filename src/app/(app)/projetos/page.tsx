import { FolderOpen } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListPanel, Page } from "@/components/layout/page";
import { NewProject } from "@/components/projects/new-project";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectRow } from "@/components/projects/project-row";
import { listAreas, listProjects } from "@/lib/projects/queries";
import { todayIn } from "@/lib/dates";

export const metadata = { title: "Projetos" };

export default async function ProjetosPage() {
  const [{ groups, finished }, areas] = await Promise.all([listProjects(), listAreas()]);
  const today = todayIn();

  return (
    <Page
      wide
      icon={FolderOpen}
      title="Projetos"
      description="Objetivos com começo e fim, agrupados por origem."
      actions={<NewProject areas={areas} today={today} inline />}
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum projeto ativo."
          description="Projetos agrupam tarefas com começo e fim."
        />
      ) : (
        <div className="flex flex-col gap-8 lg:gap-9">
          {groups.map((group) => {
            const id = `origem-${group.area?.id ?? "sem-origem"}`;
            return (
              <section key={id} aria-labelledby={id}>
                <SectionHeading id={id} title={group.label} />
                <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
                  {group.projects.map((project) => (
                    <ProjectCard key={project.id} project={project} today={today} compact />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {finished.length > 0 && (
        <details className="group mt-10 lg:max-w-3xl">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm text-foreground-subtle hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Mostrar concluídos ({finished.length})</span>
            <span className="hidden group-open:inline">Esconder concluídos</span>
          </summary>
          <ListPanel className="mt-2">
            <ul className="divide-y divide-border">
              {finished.map((project) => (
                <li key={project.id}>
                  <ProjectRow project={project} today={today} quiet />
                </li>
              ))}
            </ul>
          </ListPanel>
        </details>
      )}
    </Page>
  );
}
