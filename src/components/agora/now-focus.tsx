import type { AgoraView } from "@/types/task";
import { taskMeta } from "@/components/tasks/task-meta";
import { NowFocusAction } from "./now-focus-action";
import { SectionLabel } from "./section-label";

/** A próxima ação. O único bloco com destaque na tela. */
export function NowFocus({ task, today }: { task: NonNullable<AgoraView["now"]>; today: string }) {
  const meta = taskMeta(task, today);

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
