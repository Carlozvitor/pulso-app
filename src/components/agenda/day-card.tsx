import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { TaskSummary } from "@/types/task";
import { CardTile } from "@/components/cards/card-parts";
import { formatDuration } from "@/lib/tasks/format";

function countLabel(count: number): string {
  if (count === 0) return "Livre";
  return count === 1 ? "1 tarefa" : `${count} tarefas`;
}

/** Um dia completo na Agenda: todas as tarefas do dia, cada uma abre o detalhe. */
export function AgendaDay({ id, label, tasks }: { id: string; label: string; tasks: TaskSummary[] }) {
  return (
    <section aria-labelledby={id} className="tint tint-amber flex flex-col p-4 lg:p-5">
      <div className="flex items-center gap-3">
        <CardTile icon={CalendarDays} className="size-10 lg:size-10" />
        <div className="min-w-0">
          <h2 id={id} className="truncate text-body font-semibold">
            {label}
          </h2>
          <p className="text-caption text-white/60">{countLabel(tasks.length)}</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-white/10 border-t border-white/10">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link
              href={`/tarefas/${t.id}`}
              className="-mx-2 flex min-h-12 items-center gap-3 rounded-md px-2 py-2 transition-colors duration-(--duration-fast) hover:bg-white/5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{t.title}</span>
                {t.context && <span className="block truncate text-caption text-white/55">{t.context}</span>}
              </span>
              {t.estimatedMinutes != null && (
                <span className="tabular shrink-0 text-caption text-white/60">{formatDuration(t.estimatedMinutes)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
