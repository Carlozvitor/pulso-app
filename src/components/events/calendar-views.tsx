import Link from "next/link";
import type { CalendarDay } from "@/lib/events/views";
import type { TaskSummary } from "@/types/task";
import { dueLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { OccurrenceCard } from "./event-sheet";

/** Prazo de tarefa dentro da agenda — círculo verde = é do PULSO; toque abre a tarefa. */
function DeadlineRow({ task, today }: { task: TaskSummary; today: string }) {
  const overdue = task.dueDate !== null && task.dueDate < today;
  return (
    <li>
      <Link
        href={`/tarefas/${task.id}`}
        className="flex min-h-9 items-center gap-2 rounded-md px-1 py-1 text-[0.8125rem] text-foreground-secondary transition-colors duration-(--duration-fast) hover:bg-white/5 hover:text-foreground"
      >
        <span aria-hidden className="size-2 shrink-0 rounded-full border-[1.5px] border-teal-ink" />
        <span className="min-w-0 flex-1 truncate">{task.title}</span>
        {overdue && task.dueDate && <span className="shrink-0 text-[0.6875rem] text-foreground-subtle">{dueLabel(task.dueDate, today)}</span>}
      </Link>
    </li>
  );
}

function Deadlines({ tasks, today }: { tasks: TaskSummary[]; today: string }) {
  if (tasks.length === 0) return null;
  return (
    <div className="border-t border-border px-2 pt-2 pb-2.5">
      <p className="px-1 pb-1 text-[0.65625rem] font-semibold tracking-[0.1em] text-foreground-subtle uppercase">Prazos</p>
      <ul>
        {tasks.map((task) => (
          <DeadlineRow key={task.id} task={task} today={today} />
        ))}
      </ul>
    </div>
  );
}

/** Semana: 7 colunas no PC, um dia embaixo do outro no celular. */
export function WeekBoard({ days, today }: { days: CalendarDay[]; today: string }) {
  return (
    <div className="grid gap-2.5 lg:grid-cols-7">
      {days.map((day) => (
        <section
          key={day.date}
          aria-label={day.label}
          className={cn(
            "flex flex-col overflow-hidden rounded-xl border lg:min-h-[28rem]",
            day.isToday ? "border-amber-line bg-linear-180 from-[#1c1008] to-[#0b0b0d] to-60%" : "border-border bg-[#0b0b0d]",
          )}
        >
          <header className="flex items-baseline gap-2 border-b border-border px-3 pt-2.5 pb-2 lg:block">
            <p className={cn("text-[0.6875rem] font-semibold tracking-[0.1em] uppercase", day.isToday ? "text-amber-ink" : "text-foreground-subtle")}>
              {day.weekdayShort}
            </p>
            <p className="flex items-center gap-2 text-[1.375rem] leading-tight font-bold tracking-tight">
              {day.dayNumber}
              {day.isToday && <span className="rounded-full bg-amber-ink px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[#1f1007]">hoje</span>}
            </p>
          </header>
          <div className="grid flex-1 content-start gap-1.5 p-2">
            {day.occurrences.length === 0 && day.deadlines.length === 0 && <p className="px-1 py-1 text-caption text-foreground-subtle">Livre</p>}
            {day.occurrences.map((o) => (
              <OccurrenceCard key={`${o.eventId}-${o.date}`} occurrence={o} compact />
            ))}
          </div>
          <Deadlines tasks={day.deadlines} today={today} />
        </section>
      ))}
    </div>
  );
}

const RELATIVE_LABELS = new Set(["Hoje", "Amanhã", "Ontem"]);

/** Lista por dia (Hoje, Próximos, Concluídos). */
export function DayList({ days, today, empty }: { days: CalendarDay[]; today: string; empty: string }) {
  const hasAnything = days.some((d) => d.occurrences.length > 0 || d.deadlines.length > 0);
  if (!hasAnything) return <p className="panel px-4 py-5 text-sm text-foreground-subtle">{empty}</p>;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {days.map((day) => (
        <section key={day.date} aria-label={day.label}>
          <h2 className={cn("mb-2 px-0.5 text-caption font-semibold tracking-[0.1em] uppercase", day.isToday ? "text-amber-ink" : "text-foreground-secondary")}>
            {day.label}
            {/* "Hoje · qua, 30": dias relativos ganham a data; os outros já trazem ("Quinta, 1 out"). */}
            {RELATIVE_LABELS.has(day.label) && ` · ${day.weekdayShort.toLowerCase()}, ${day.dayNumber}`}
          </h2>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {day.occurrences.map((o) => (
              <OccurrenceCard key={`${o.eventId}-${o.date}`} occurrence={o} />
            ))}
          </div>
          {day.deadlines.length > 0 && (
            <div className="mt-2 rounded-xl border border-border [&>div]:border-t-0">
              <Deadlines tasks={day.deadlines} today={today} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
