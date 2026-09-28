import type { TaskSummary } from "@/types/task";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/tasks/format";
import { SectionLabel } from "./section-label";

/** A próxima ação. O único bloco com destaque na tela. */
export function NowFocus({ task }: { task: TaskSummary }) {
  const meta = [task.context, task.estimatedMinutes != null ? formatDuration(task.estimatedMinutes) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="agora-label" className="rounded-lg bg-surface p-5">
      <SectionLabel id="agora-label" accent>
        Agora
      </SectionLabel>
      <p className="mt-3 text-title font-semibold text-balance">{task.title}</p>
      {meta && <p className="tabular mt-1 text-sm text-foreground-secondary">{meta}</p>}
      {/* Fase 3/5: "Começar" marca a tarefa como IN_PROGRESS. */}
      <Button size="touch" className="mt-5 w-full">
        Começar
      </Button>
    </section>
  );
}
