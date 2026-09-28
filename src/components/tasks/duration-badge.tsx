import { formatDuration } from "@/lib/tasks/format";
import { cn } from "@/lib/utils";

export function DurationBadge({ minutes, className }: { minutes: number | null; className?: string }) {
  if (minutes == null) return null;
  return <span className={cn("tabular text-sm text-foreground-subtle", className)}>{formatDuration(minutes)}</span>;
}
