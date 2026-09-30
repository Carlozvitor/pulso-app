"use client";

import type { OriginTask } from "@/lib/origins/summary";
import { OriginActions } from "@/components/origins/origin-actions";
import { createProjectTask } from "@/lib/actions/client";

/** Ações do projeto no PULSO, por prioridade. Em andamento tem o campo de nova ação; pausado e concluído, não. */
export function ProjectActions({
  projectId,
  name,
  tasks,
  today,
  canAdd,
  empty,
}: {
  projectId: string;
  name: string;
  tasks: OriginTask[];
  today: string;
  canAdd: boolean;
  empty: string;
}) {
  return (
    <OriginActions
      tasks={tasks}
      today={today}
      addTo={canAdd ? { id: projectId, name, create: (title) => createProjectTask(projectId, title) } : undefined}
      empty={empty}
    />
  );
}
