import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { SectionLabel } from "@/components/agora/section-label";
import { PageHeader } from "@/components/navigation/page-header";
import { NewProject } from "@/components/projects/new-project";
import { ProjectRow } from "@/components/projects/project-row";
import { listAreas, listProjects } from "@/lib/projects/queries";
import { todayIn } from "@/lib/dates";

export const metadata = { title: "Projetos" };

export default async function ProjetosPage() {
  const [{ groups, finished }, areas] = await Promise.all([listProjects(), listAreas()]);
  const today = todayIn();

  return (
    <>
      <PageHeader title="Projetos" />

      {groups.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum projeto ativo."
          description="Projetos agrupam tarefas com começo e fim."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const id = `area-${group.area?.id ?? "sem-area"}`;
            return (
              <section key={id} aria-labelledby={id}>
                <SectionLabel id={id}>{group.area?.name ?? "Sem área"}</SectionLabel>
                <ul className="mt-2 divide-y divide-border">
                  {group.projects.map((project) => (
                    <li key={project.id}>
                      <ProjectRow project={project} today={today} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <NewProject areas={areas} today={today} />
      </div>

      {finished.length > 0 && (
        <details className="group mt-10">
          <summary className="-mx-4 flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-foreground-subtle [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Mostrar concluídos ({finished.length})</span>
            <span className="hidden group-open:inline">Esconder concluídos</span>
          </summary>
          <ul className="mt-2 divide-y divide-border">
            {finished.map((project) => (
              <li key={project.id}>
                <ProjectRow project={project} today={today} quiet />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
