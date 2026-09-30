import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CardTile } from "@/components/cards/card-parts";
import type { AttentionItem, AttentionList } from "@/lib/central/central";
import type { Occurrence } from "@/types/event";
import { dueLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

function when(item: AttentionItem, today: string): string {
  const label = dueLabel(item.date, today);
  const day = label.charAt(0).toUpperCase() + label.slice(1);
  return item.kind === "event" && item.time ? `${day} · ${item.time}` : day;
}

function origin(item: AttentionItem): string | null {
  if (item.kind === "project") return `Prazo do projeto · ${item.progress.done} de ${item.progress.total} feitas`;
  return item.context;
}

function hrefOf(item: AttentionItem): string {
  if (item.kind === "task") return `/tarefas/${item.id}`;
  if (item.kind === "project") return `/projetos/${item.id}`;
  return `/compromissos?dia=${item.date}`;
}

const rowClass =
  "flex min-h-12 items-center gap-3 rounded-lg bg-black/20 px-3 py-2 transition-colors duration-(--duration-fast) hover:bg-black/35";

/** Compromisso de hoje: horário à esquerda, como na agenda. */
function EventRow({ event }: { event: Occurrence }) {
  const meta = [event.location, event.context].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href="/compromissos?vista=hoje" className={rowClass}>
        <span className="tabular w-12 shrink-0 font-mono text-[0.8125rem] font-semibold text-amber-ink">{event.allDay ? "Dia" : event.startTime}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{event.title}</span>
          {meta && <span className="block truncate text-caption text-white/50">{meta}</span>}
        </span>
      </Link>
    </li>
  );
}

/**
 * Card da Central com uma lista (Hoje ou Próximas atenções).
 * Em Hoje, os compromissos vêm primeiro e os prazos embaixo. Cada linha abre o que ela é;
 * o que passou do limite vira "e mais N".
 */
export function AttentionCard({
  id,
  tone,
  icon,
  title,
  subtitle,
  list,
  today,
  empty,
  events = [],
}: {
  id: string;
  tone: "amber" | "neutral";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  list: AttentionList;
  today: string;
  empty: string;
  /** Compromissos de hoje (só no card Hoje). */
  events?: Occurrence[];
}) {
  const nothing = list.items.length === 0 && events.length === 0;
  return (
    <section aria-labelledby={id} className={cn("tint flex flex-col p-4 lg:p-5 lg:px-6", tone === "amber" ? "tint-amber" : "tint-neutral")}>
      <div className="flex items-center gap-3.5">
        <CardTile icon={icon} />
        <div className="min-w-0">
          <h2 id={id} className="text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.375rem]">
            {title}
          </h2>
          <p className="truncate text-caption text-white/60">{subtitle}</p>
        </div>
      </div>

      {nothing && <p className="mt-4 rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60">{empty}</p>}

      {events.length > 0 && (
        <ul className="mt-4 grid gap-0.5">
          {events.map((event) => (
            <EventRow key={`${event.eventId}-${event.date}`} event={event} />
          ))}
        </ul>
      )}

      {list.items.length > 0 && (
        <>
          {events.length > 0 && <p className="mt-3 px-1 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.1em] text-white/45 uppercase">Prazos</p>}
          <ul className={cn("grid gap-0.5", events.length === 0 && "mt-4")}>
            {list.items.map((item) => {
              const sub = origin(item);
              return (
                <li key={`${item.kind}-${item.id}-${item.date}`}>
                  <Link href={hrefOf(item)} className={rowClass}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {sub && (
                        <span className={cn("block truncate text-caption", item.kind === "project" ? "text-plum-ink" : "text-white/50")}>
                          {sub}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "tabular shrink-0 text-caption font-semibold",
                        tone === "amber" || item.kind === "event" ? "text-amber-ink" : "text-white/60",
                      )}
                    >
                      {when(item, today)}
                    </span>
                  </Link>
                </li>
              );
            })}
            {list.more > 0 && (
              <li>
                <Link href="/compromissos" className="block px-3 pt-2 text-caption text-white/55 transition-colors duration-(--duration-fast) hover:text-white">
                  e mais {list.more} em Compromissos
                </Link>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
