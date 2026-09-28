import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { TaskEditor } from "@/components/tasks/task-editor";
import { getTask } from "@/lib/tasks/queries";
import { todayIn } from "@/lib/dates";

export const metadata = { title: "Tarefa" };

export default async function TarefaPage({ params }: PageProps<"/tarefas/[id]">) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  return (
    <>
      <div className="pt-2 pb-4">
        <BackButton />
      </div>
      {/* Sem key por updatedAt: o salvamento automático não pode remontar o formulário no meio da edição. */}
      <TaskEditor task={task} today={todayIn()} />
    </>
  );
}
