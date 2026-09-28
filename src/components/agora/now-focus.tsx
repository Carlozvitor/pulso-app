import type { AgoraView } from "@/types/task";
import { formatDuration } from "@/lib/tasks/format";
import { NowFocusAction } from "./now-focus-action";
import { SectionLabel } from "./section-label";

/** A próxima ação. O único bloco com destaque na tela. */
export function NowFocus({ task }: { task: NonNullable<AgoraView["now"]> }) {
  const meta = [task.context, task.estimatedMinutes != null ? formatDuration(task.estimatedMinutes) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="agora-label" className="rounded-lg bg-surface p-5">
      <SectionLabel id="agora-label" accent>
        {task.status === "IN_PROGRESS" ? "Em andamento" : "Agora"}
      </SectionLabel>
      <p className="mt-3 text-title font-semibold text-balance">{task.title}</p>
      {meta && <p className="tabular mt-1 text-sm text-foreground-secondary">{meta}</p>}
      <NowFocusAction taskId={task.id} status={task.status} />
    </section>
  );
}
