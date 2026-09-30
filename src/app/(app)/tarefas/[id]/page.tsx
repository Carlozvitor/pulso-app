import { notFound } from "next/navigation";
import { SquareCheck } from "lucide-react";
import { Page } from "@/components/layout/page";
import { TaskEditor } from "@/components/tasks/task-editor";
import { getAssignOptions } from "@/lib/projects/queries";
import { getTask } from "@/lib/tasks/queries";
import { todayIn } from "@/lib/dates";
import { indexOrigins, originFullLabel } from "@/lib/origins/tree";

export const metadata = { title: "Tarefa" };

export default async function TarefaPage({ params }: PageProps<"/tarefas/[id]">) {
  const { id } = await params;
  const [task, options] = await Promise.all([getTask(id), getAssignOptions()]);
  if (!task) notFound();

  const project = options.projects.find((p) => p.id === task.projectId);
  const origin = task.areaId ? originFullLabel(task.areaId, indexOrigins(options.areas)) : null;

  return (
    <Page back icon={SquareCheck} title="Tarefa" description={project?.name ?? origin ?? "Sem projeto nem origem"}>
      {/* Sem key por updatedAt: o salvamento automático não pode remontar o formulário no meio da edição. */}
      <TaskEditor task={task} today={todayIn()} options={options} />
    </Page>
  );
}
