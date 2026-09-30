import { notFound } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { Page } from "@/components/layout/page";
import { ProgressBar } from "@/components/projects/progress-bar";
import { ProjectEditor } from "@/components/projects/project-editor";
import { ProjectStatusActions } from "@/components/projects/project-status-actions";
import { ProjectTasks } from "@/components/projects/project-tasks";
import { getProject } from "@/lib/projects/queries";
import { todayIn } from "@/lib/dates";
import { indexOrigins, originFullLabel } from "@/lib/origins/tree";

export const metadata = { title: "Projeto" };

export default async function ProjetoPage({ params }: PageProps<"/projetos/[id]">) {
  const { id } = await params;
  const detail = await getProject(id);
  if (!detail) notFound();

  const { project, areas, progress, openTasks } = detail;
  const today = todayIn();

  return (
    <Page back icon={FolderOpen} title="Projeto" description={(project.areaId && originFullLabel(project.areaId, indexOrigins(areas))) || "Sem origem"}>
      {/* Sem key por dados do projeto: o salvamento automático não pode remontar o editor no meio da edição. */}
      <ProjectEditor project={project} areas={areas} today={today} />

      {progress.total > 0 && (
        <div className="mt-8 flex flex-col gap-2">
          <p className="tabular text-sm text-foreground-secondary">
            {progress.percent}% · {progress.done} de {progress.total} concluídas
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
          energy: t.energy,
          paused: t.status === "TODO" && t.pausedAt !== null,
        }))}
        today={today}
        canAdd={project.status === "ACTIVE"}
      />

      <ProjectStatusActions projectId={project.id} status={project.status} openCount={openTasks.length} />
    </Page>
  );
}
