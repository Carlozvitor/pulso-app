import Link from "next/link";
import type { WeekClass } from "@/lib/faculdade/summary";
import { WEEKDAYS_SHORT, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Aulas e estudo desta semana (compromissos que se repetem, com origem na Faculdade). */
export function WeekClasses({ week, today }: { week: WeekClass[]; today: string }) {
  if (week.length === 0) {
    return (
      <p className="rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60">
        Nenhuma aula nesta semana. Em cada disciplina, “Novo horário” cria a aula que se repete.
      </p>
    );
  }
  return (
    <ul className="grid gap-0.5">
      {week.map((o) => {
        const isToday = o.date === today;
        return (
          <li key={`${o.eventId}-${o.date}`}>
            <Link
              href={`/compromissos?dia=${o.date}`}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-(--duration-fast) hover:bg-white/5",
                isToday && "bg-white/5 shadow-[inset_0_0_0_1px_var(--border-strong)]",
                o.past && !isToday && "opacity-45",
              )}
            >
              <span
                className={cn(
                  "w-14 shrink-0 text-xs font-semibold tracking-[0.06em] uppercase",
                  isToday ? "text-rose-ink" : "text-foreground-subtle",
                )}
              >
                {isToday ? "Hoje" : `${WEEKDAYS_SHORT[weekday(o.date)]} ${Number(o.date.slice(8, 10))}`}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-medium">{o.title}</span>
                {o.flags.map((flag) => (
                  <span key={flag} className="shrink-0 rounded-[5px] bg-rose-ink/10 px-1.5 py-px text-[0.6875rem] font-semibold text-rose-ink">
                    {flag}
                  </span>
                ))}
              </span>
              <span className="tabular shrink-0 font-mono text-xs font-semibold text-foreground-secondary">{o.allDay ? "Dia" : o.startTime}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
