import type { CalendarEvent, Occurrence } from "@/types/event";
import { WEEKDAYS, addDays, addMinutesToTime, shortDate, weekday } from "@/lib/dates";

/** "Agora" no fuso do usuário: data e hora ("14:35"). */
export type Now = { date: string; time: string };

export type AreaLabel = (areaId: string | null) => string | null;

export function isRecurring(event: Pick<CalendarEvent, "repeatDays">): boolean {
  return event.repeatDays.length > 0;
}

/** Datas em que o compromisso acontece dentro de [from, to] (inclusive). */
export function eventDates(event: CalendarEvent, from: string, to: string): string[] {
  if (!isRecurring(event)) return event.startDate >= from && event.startDate <= to ? [event.startDate] : [];
  const first = event.startDate > from ? event.startDate : from;
  const last = event.repeatUntil && event.repeatUntil < to ? event.repeatUntil : to;
  const skipped = new Set(event.skippedDates);
  const dates: string[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) {
    if (event.repeatDays.includes(weekday(date)) && !skipped.has(date)) dates.push(date);
  }
  return dates;
}

/** Já terminou? Dia todo só "passa" no dia seguinte; sem duração, termina no horário de início. */
export function isPast(o: Pick<Occurrence, "date" | "allDay" | "startTime" | "endTime">, now: Now): boolean {
  if (o.date !== now.date) return o.date < now.date;
  if (o.allDay || !o.startTime) return false;
  const end = o.endTime ?? o.startTime;
  // Termina depois da meia-noite: hoje ainda não passou.
  if (end < o.startTime) return false;
  return end <= now.time;
}

/** Ordem do dia: dia todo primeiro, depois pelo horário, depois pelo nome. */
export function compareOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  if (a.startTime !== b.startTime) return (a.startTime ?? "") < (b.startTime ?? "") ? -1 : 1;
  return a.title.localeCompare(b.title, "pt-BR");
}

/** Todas as ocorrências entre `from` e `to`, em ordem, com "já passou" em relação a `now`. */
export function occurrencesBetween(
  events: CalendarEvent[],
  from: string,
  to: string,
  now: Now,
  areaLabel: AreaLabel = () => null,
): Occurrence[] {
  return events
    .flatMap((event) =>
      eventDates(event, from, to).map((date): Occurrence => {
        const allDay = event.startTime === null;
        const endTime = event.startTime && event.durationMinutes ? addMinutesToTime(event.startTime, event.durationMinutes) : null;
        const base = { date, allDay, startTime: event.startTime, endTime };
        return {
          ...base,
          eventId: event.id,
          title: event.title,
          location: event.location,
          areaId: event.areaId,
          durationMinutes: event.durationMinutes,
          recurring: isRecurring(event),
          context: areaLabel(event.areaId),
          past: isPast(base, now),
        };
      }),
    )
    .sort(compareOccurrences);
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;

/**
 * A regra em português: "Toda segunda e quarta, até 12 dez" · "Todo dia" · "De segunda a sexta".
 * Sem repetição, null.
 */
export function repeatLabel(days: number[], until: string | null): string | null {
  if (days.length === 0) return null;
  const sorted = [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // segunda primeiro
  let rule: string;
  if (sorted.length === 7) rule = "Todo dia";
  else if (sorted.join() === "1,2,3,4,5") rule = "De segunda a sexta";
  else {
    const names = sorted.map((d) => WEEKDAYS[d]);
    // sábado e domingo são masculinos: "Todo sábado", "Toda segunda".
    const lead = sorted[0] === 0 || sorted[0] === 6 ? "Todo" : "Toda";
    rule = `${lead} ${joinNames(names)}`;
  }
  return until ? `${rule}, até ${shortDate(until)}` : rule;
}
