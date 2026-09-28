"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { TaskStatus } from "@/types/task";
import { Button } from "@/components/ui/button";
import { setTaskStatus } from "@/lib/tasks/actions";

/** "Começar" → em andamento. Se já está em andamento, "Concluir". */
export function NowFocusAction({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [pending, startTransition] = useTransition();
  const inProgress = status === "IN_PROGRESS";

  function run() {
    startTransition(async () => {
      const result = await setTaskStatus(taskId, inProgress ? "DONE" : "IN_PROGRESS");
      if (!result.ok) return void toast.error(result.error);
      if (inProgress) {
        toast("Concluída. Próximo passo logo abaixo.", {
          action: {
            label: "Desfazer",
            onClick: () => startTransition(async () => void (await setTaskStatus(taskId, "IN_PROGRESS"))),
          },
        });
      }
    });
  }

  return (
    <Button size="touch" disabled={pending} onClick={run} className="mt-5 w-full">
      {inProgress ? "Concluir" : "Começar"}
    </Button>
  );
}
