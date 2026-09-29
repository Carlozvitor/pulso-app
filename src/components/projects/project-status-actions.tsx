"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ProjectStatus } from "@/types/project";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/feedback/confirm-sheet";
import { finishProject, reopenProject } from "@/lib/actions/client";

type Finish = { to: "DONE" | "ARCHIVED"; confirm: string; toast: string };

const FINISH: Record<Finish["to"], Finish> = {
  DONE: { to: "DONE", confirm: "Concluir projeto", toast: "Projeto concluído." },
  ARCHIVED: { to: "ARCHIVED", confirm: "Arquivar projeto", toast: "Projeto arquivado." },
};

function openTasksNote(count: number): string {
  return count === 1
    ? "1 tarefa ainda aberta vai para o arquivo."
    : `${count} tarefas ainda abertas vão para o arquivo.`;
}

/** Concluir/arquivar (com aviso se houver tarefas abertas) ou reabrir. */
export function ProjectStatusActions({
  projectId,
  status,
  openCount,
}: {
  projectId: string;
  status: ProjectStatus;
  openCount: number;
}) {
  const [confirming, setConfirming] = useState<Finish | null>(null);
  const [pending, startTransition] = useTransition();

  function finish(action: Finish) {
    startTransition(async () => {
      const result = await finishProject(projectId, action.to);
      setConfirming(null);
      if (!result.ok) return void toast.error(result.error);
      toast(action.toast);
    });
  }

  function request(action: Finish) {
    if (openCount > 0) setConfirming(action);
    else finish(action);
  }

  if (status !== "ACTIVE") {
    return (
      <div className="mt-10 border-t border-border pt-6">
        <Button
          variant="secondary"
          size="touch"
          disabled={pending}
          className="w-full"
          onClick={() =>
            startTransition(async () => {
              const result = await reopenProject(projectId);
              if (!result.ok) return void toast.error(result.error);
              toast("Projeto reaberto.");
            })
          }
        >
          Reabrir projeto
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 flex gap-3 border-t border-border pt-6">
      <Button variant="secondary" size="touch" disabled={pending} onClick={() => request(FINISH.DONE)} className="flex-1">
        Concluir
      </Button>
      <Button
        variant="secondary"
        size="touch"
        disabled={pending}
        onClick={() => request(FINISH.ARCHIVED)}
        className="flex-1"
      >
        Arquivar
      </Button>

      <ConfirmSheet
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? `${confirming.confirm}?` : ""}
        description={openTasksNote(openCount)}
        confirmLabel={confirming?.confirm ?? ""}
        onConfirm={() => confirming && finish(confirming)}
        pending={pending}
      />
    </div>
  );
}
