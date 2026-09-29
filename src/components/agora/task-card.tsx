import Link from "next/link";
import { Activity, ArrowUpRight, Circle, Feather, Zap, type LucideIcon } from "lucide-react";
import type { Energy, TaskSummary } from "@/types/task";
import { CardFoot, CardTile } from "@/components/cards/card-parts";
import { dueLabel } from "@/lib/dates";
import { formatDuration } from "@/lib/tasks/format";
import { cn } from "@/lib/utils";

/** O selo mostra a energia que a tarefa pede: leve, média, pesada. */
const ENERGY_ICON: Record<Energy, LucideIcon> = { LOW: Feather, MEDIUM: Activity, HIGH: Zap };

/** Card de tarefa ("Depois" em teal, "Mais tarde" neutro). Toque abre o detalhe. */
export function TaskCard({ task, today, tone, note }: { task: TaskSummary; today: string; tone: "teal" | "neutral"; note: string }) {
  const meta = [task.context, task.dueDate ? dueLabel(task.dueDate, today) : null].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/tarefas/${task.id}`}
      className={cn(
        "tint group flex min-h-40 flex-col p-5 transition-[filter] duration-(--duration-fast) hover:brightness-115 lg:min-h-52 lg:px-6",
        tone === "teal" ? "tint-teal" : "tint-neutral",
      )}
    >
      <span className="flex items-start justify-between">
        <CardTile icon={task.energy ? ENERGY_ICON[task.energy] : Circle} />
        <ArrowUpRight
          aria-hidden
          className="size-5 text-(--tint-ink) opacity-60 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </span>
      {meta && <span className="mt-5 block truncate text-sm text-white/70">{meta}</span>}
      <span
        className={cn(
          "line-clamp-3 text-[1.125rem] leading-snug font-semibold tracking-tight lg:text-[1.25rem]",
          meta ? "mt-0.5" : "mt-5",
          tone === "neutral" && "text-foreground-secondary",
        )}
      >
        {task.title}
      </span>
      <CardFoot left={note} right={task.estimatedMinutes != null ? formatDuration(task.estimatedMinutes) : undefined} />
    </Link>
  );
}
