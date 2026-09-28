import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { ProgressBar } from "@/components/projects/progress-bar";
import { ProjectEditor } from "@/components/projects/project-editor";
import { ProjectStatusActions } from "@/components/projects/project-status-actions";
import { ProjectTasks } from "@/components/projects/project-tasks";
import { getProject } from "@/lib/projects/queries";
import { todayIn } from "@/lib/dates";

export const metadata = { title: "Projeto" };

export default async function ProjetoPage({ params }: PageProps<"/projetos/[id]">) {
  const { id } = await params;
  const detail = await getProject(id);
  if (!detail) notFound();

  const { project, areas, progress, openTasks } = detail;
  const today = todayIn();

  return (
    <>
      <div className="pt-2 pb-4">
        <BackButton />
      </div>
      {/* Sem key por dados do projeto: o salvamento automático não pode remontar o editor no meio da edição. */}
      <ProjectEditor project={project} areas={areas} today={today} />

      {progress.total > 0 && (
        <div className="mt-8 flex flex-col gap-2">
          <p className="tabular text-sm text-foreground-secondary">
            {progress.done} de {progress.total} concluídas
          </p>
          <ProgressBar progress={progress} label={`Progresso de ${project.name}`} />
        </div>
      )}

      <ProjectTasks
        projectId={project.id}
        tasks={openTasks.map((t) => ({
          id: t.id,
          title: t.title,
          context: null,
          estimatedMinutes: t.estimatedMinutes,
          dueDate: t.dueDate,
        }))}
        today={today}
        canAdd={project.status === "ACTIVE"}
      />

      <ProjectStatusActions projectId={project.id} status={project.status} openCount={openTasks.length} />
    </>
  );
}
