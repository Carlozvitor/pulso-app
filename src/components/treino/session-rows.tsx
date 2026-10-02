import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { WEEKDAYS_SHORT, shortDate, weekday } from "@/lib/dates";
import { exercisesLabel } from "@/lib/treino/format";
import { dayLabel, upsLabel, type SessionSummary } from "@/lib/treino/summary";

/** Quando foi, em relação a hoje: "hoje" · "ontem" · "seg" (esta semana) · "26 set". */
function whenLabel(date: string, today: string): string {
  const label = dayLabel(date, today);
  return label === "hoje" || label === "ontem" ? label : shortDate(date);
}

/** Treinos feitos: o dia num selo, o que foi feito e quantos subiram. Toque abre o treino. */
export function SessionRows({ sessions, today, empty }: { sessions: SessionSummary[]; today: string; empty: string }) {
  if (sessions.length === 0) return <p className="px-3 py-3.5 text-sm text-foreground-secondary">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {sessions.map((s) => (
        <li key={s.session.id}>
          <Link
            href={`/treino/fazer/${s.session.id}`}
            className="flex min-h-15 items-center gap-3.5 px-2 py-2.5 transition-colors duration-(--duration-fast) hover:bg-white/4 lg:px-3"
          >
            <span className="w-10 shrink-0 text-center leading-tight">
              <span className="block text-[0.625rem] font-semibold tracking-[0.08em] text-foreground-subtle uppercase">{WEEKDAYS_SHORT[weekday(s.session.date)]}</span>
              <span className="tabular block text-lg font-semibold tracking-tight">{Number(s.session.date.slice(8))}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{s.title}</span>
              <span className="block truncate text-caption text-foreground-subtle">
                {[s.names, exercisesLabel(s.done), upsLabel(s.ups)].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="tabular shrink-0 font-mono text-xs font-semibold text-foreground-secondary">{whenLabel(s.session.date, today)}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-ui" strokeWidth={1.75} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
