import { Check } from "lucide-react";
import { WEEKDAYS, shortDate } from "@/lib/dates";
import { averageLabel, type Frequency } from "@/lib/treino/summary";
import { cn } from "@/lib/utils";

/** "faltam 2 até domingo" · "meta da semana feita" — direção, sem cobrança. */
function weekHint(count: number, goal: number | null): { text: string; done: boolean } | null {
  if (!goal) return null;
  if (count >= goal) return { text: "meta da semana feita", done: true };
  const left = goal - count;
  return { text: `${left === 1 ? "falta 1" : `faltam ${left}`} até domingo`, done: false };
}

/** Frequência: esta semana em bolinhas e as últimas 8 em quadradinhos. Sem sequência, sem medalha. */
export function FrequencyCard({ frequency }: { frequency: Frequency }) {
  const { current, weeks, goal, average } = frequency;
  const hint = weekHint(current.count, goal);
  const unit = goal ? `de ${goal} esta semana` : current.count === 1 ? "treino esta semana" : "treinos esta semana";

  return (
    <div className="tint tint-neutral flex flex-1 flex-col p-4 lg:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-2">
          <span className="tabular text-[1.875rem] leading-none font-bold tracking-tight">{current.count}</span>
          <span className="text-sm text-foreground-secondary">{unit}</span>
        </p>
        {hint && <span className={cn("text-caption", hint.done ? "text-lime-ink" : "text-foreground-subtle")}>{hint.text}</span>}
      </div>

      <ol aria-label="Esta semana" className="mt-4 grid grid-cols-7 gap-1">
        {current.days.map((day, i) => (
          <li
            key={day.date}
            aria-label={`${WEEKDAYS[(i + 1) % 7]}: ${day.trained ? "treinou" : day.future ? "ainda não chegou" : "sem treino"}`}
            className={cn(
              "grid justify-items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.05em] uppercase",
              day.today ? "text-lime-ink" : day.trained ? "text-foreground-secondary" : "text-foreground-subtle",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-8 place-items-center rounded-full border-[1.5px]",
                day.trained
                  ? "border-lime-ink bg-lime-ink text-[#141a04]"
                  : day.today
                    ? "border-dashed border-lime-ink"
                    : day.future
                      ? "border-[#26262b]"
                      : "border-[#3a3a40]",
              )}
            >
              {day.trained && <Check className="size-4" strokeWidth={2.5} />}
            </span>
            {day.today ? "Hoje" : day.label}
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-border pt-3.5">
        <div className="flex flex-wrap justify-between gap-x-3 text-caption text-foreground-subtle">
          <span>Últimas {weeks.length} semanas</span>
          {average !== null && <span>{averageLabel(average)}</span>}
        </div>
        <div
          role="img"
          aria-label={`Treinos por semana, da mais antiga a esta: ${weeks.map((w) => w.count).join(", ")}`}
          className="mt-2.5 grid grid-cols-8 gap-1.5"
        >
          {weeks.map((week, i) => {
            const month = week.start.slice(5, 7);
            const label = i === 0 || month !== weeks[i - 1].start.slice(5, 7) ? shortDate(week.start) : String(Number(week.start.slice(8)));
            return (
              <div key={week.start} className="grid justify-items-center gap-[3px]">
                {week.days.map((day) => (
                  <span
                    key={day.date}
                    className={cn(
                      "size-3 rounded-[3px]",
                      day.trained ? "bg-lime-ink" : day.today ? "shadow-[inset_0_0_0_1.5px_var(--lime-ink)]" : day.future ? "shadow-[inset_0_0_0_1px_#26262b]" : "bg-[#1f1f24]",
                    )}
                  />
                ))}
                <span className={cn("tabular mt-1 font-mono text-[0.71875rem] font-semibold", week.hit ? "text-lime-ink" : "text-foreground-secondary")}>{week.count}</span>
                <span className="text-[0.65625rem] whitespace-nowrap text-foreground-subtle">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
