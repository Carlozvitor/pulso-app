import { dueLabel } from "@/lib/dates";
import { formatDuration } from "@/lib/tasks/format";

type TaskMetaInput = {
  context?: string | null;
  dueDate: string | null;
  estimatedMinutes?: number | null;
};

/** "Valentine · Hoje · 10 min" — só o que existe, sem cor de alerta. */
export function taskMeta({ context, dueDate, estimatedMinutes }: TaskMetaInput, today: string): string {
  return [
    context,
    dueDate ? dueLabel(dueDate, today) : null,
    estimatedMinutes != null ? formatDuration(estimatedMinutes) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
