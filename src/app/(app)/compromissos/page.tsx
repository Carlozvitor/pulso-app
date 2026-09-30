import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { DayList, WeekBoard } from "@/components/events/calendar-views";
import { EventSheetProvider, NewEventButton } from "@/components/events/event-sheet";
import { Page } from "@/components/layout/page";
import { addDays, shortDate, startOfWeek } from "@/lib/dates";
import { getCompromissosPage, getTodaySummary, type CalendarView } from "@/lib/events/queries";
import { listAreas } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Compromissos" };

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "proximos", label: "Próximos" },
  { id: "concluidos", label: "Concluídos" },
];

const EMPTY: Record<Exclude<CalendarView, "semana">, string> = {
  hoje: "Nada marcado para hoje.",
  proximos: "Nada marcado nos próximos 30 dias.",
  concluidos: "Nada aconteceu nos últimos 30 dias — ou ainda não foi anotado.",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const navButton =
  "flex size-9 items-center justify-center rounded-lg border border-border-strong bg-elevated text-foreground-secondary transition-colors duration-(--duration-fast) hover:bg-[#1d1d22] hover:text-foreground";

function summaryLabel(count: number, next: { time: string | null; title: string } | null): string {
  if (count === 0) return "Nada marcado hoje.";
  const today = count === 1 ? "1 compromisso hoje" : `${count} compromissos hoje`;
  return next?.time ? `${today} · próximo ${next.time}` : today;
}

/** Compromissos: quando as coisas acontecem. Os prazos das tarefas aparecem junto, na semana. */
export default async function CompromissosPage({ searchParams }: PageProps<"/compromissos">) {
  const { vista, dia } = await searchParams;
  const view: CalendarView = VIEWS.some((v) => v.id === vista) ? (vista as CalendarView) : "semana";
  const anyDay = typeof dia === "string" && ISO_DATE.test(dia) ? dia : undefined;
  const [page, areas, summary] = await Promise.all([getCompromissosPage(view, anyDay), listAreas(), getTodaySummary()]);
  const today = page.now.date;
  const weekStart = startOfWeek(anyDay ?? today);
  const thisWeek = weekStart === startOfWeek(today);

  return (
    <EventSheetProvider events={page.events} areas={areas} today={today}>
      <Page
        wide
        icon={CalendarClock}
        iconClassName="bg-amber-tile text-amber-ink shadow-[inset_0_0_0_1px_var(--amber-line)]"
        title="Compromissos"
        description={summaryLabel(summary.count, summary.next)}
        actions={<NewEventButton date={view === "semana" && !thisWeek ? weekStart : undefined} />}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Visão" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
            {VIEWS.map((v) => (
              <Link
                key={v.id}
                href={v.id === "semana" ? "/compromissos" : `/compromissos?vista=${v.id}`}
                aria-current={view === v.id ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors duration-(--duration-fast)",
                  view === v.id
                    ? "border-amber-line bg-amber-tile text-[#ffedd5]"
                    : "border-border-strong bg-[#141417] text-foreground-secondary hover:text-foreground",
                )}
              >
                {v.label}
              </Link>
            ))}
          </nav>

          {view === "semana" && (
            <div className="flex items-center gap-2">
              <Link href={`/compromissos?dia=${addDays(weekStart, -7)}`} scroll={false} aria-label="Semana anterior" className={navButton}>
                <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
              <p className="tabular min-w-32 text-center text-[0.9375rem] font-semibold">
                {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}
              </p>
              <Link href={`/compromissos?dia=${addDays(weekStart, 7)}`} scroll={false} aria-label="Próxima semana" className={navButton}>
                <ChevronRight aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
              {!thisWeek && (
                <Link href="/compromissos" scroll={false} className={cn(navButton, "w-auto px-3 text-sm")}>
                  Esta semana
                </Link>
              )}
            </div>
          )}
        </div>

        {view === "semana" ? <WeekBoard days={page.days} today={today} /> : <DayList days={page.days} today={today} empty={EMPTY[view]} />}
      </Page>
    </EventSheetProvider>
  );
}
