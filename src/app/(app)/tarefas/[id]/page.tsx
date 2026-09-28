import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { TaskEditor } from "@/components/tasks/task-editor";
import { getTask } from "@/lib/tasks/queries";

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
      {/* key: reinicia o formulário quando a tarefa muda no servidor */}
      <TaskEditor key={task.updatedAt} task={task} />
    </>
  );
}
