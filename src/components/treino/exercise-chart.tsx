import type { ExerciseKind } from "@/types/workout";
import { KIND_UNIT, formatNumber } from "@/lib/treino/format";
import type { ChartModel } from "@/lib/treino/summary";
import { cn } from "@/lib/utils";

const pct = (f: number) => `${f * 100}%`;

/**
 * Gráfico pequeno da página do exercício: um ponto por treino, na escala (x pelo dia,
 * y pelo número do tipo). As linhas são SVG esticado; números e pontos são HTML por cima,
 * para continuarem legíveis no celular. O último ponto é cheio; a melhor marca ganha o número.
 */
export function ExerciseChart({ chart, kind, bestText, label }: { chart: ChartModel; kind: ExerciseKind; bestText: string | null; label: string }) {
  const unit = KIND_UNIT[kind];
  const line = chart.points.map((p) => `${p.fx * 100},${p.fy * 100}`).join(" ");
  const first = chart.points[0];
  const last = chart.points[chart.points.length - 1];
  const area = `${line} ${last.fx * 100},100 ${first.fx * 100},100`;
  const best = chart.points.find((p) => p.best && !p.last);

  return (
    <figure role="img" aria-label={label} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2">
      {/* Números da grade, alinhados às linhas. */}
      <div aria-hidden className="relative h-44 lg:h-52">
        <div className="absolute inset-x-0 top-6 bottom-2">
          {chart.ticks.map((tick, i) => (
            <span
              key={tick.value}
              style={{ top: pct(tick.fy) }}
              className="tabular absolute right-0 -translate-y-1/2 font-mono text-[0.6875rem] whitespace-nowrap text-foreground-subtle"
            >
              {formatNumber(tick.value)}
              {i === chart.ticks.length - 1 ? ` ${unit}` : ""}
            </span>
          ))}
        </div>
      </div>

      <div aria-hidden className="relative h-44 lg:h-52">
        <div className="absolute inset-x-2 top-6 bottom-2">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {chart.ticks.map((tick) => (
              <line key={tick.value} x1={0} x2={100} y1={tick.fy * 100} y2={tick.fy * 100} className="stroke-[#26262c]" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <polygon points={area} className="fill-lime-ink/8" />
            <polyline points={line} fill="none" className="stroke-lime-ink" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {chart.points.map((p, i) => (
            <span
              key={i}
              style={{ left: pct(p.fx), top: pct(p.fy) }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                p.last ? "size-2.5 bg-lime-ink" : "size-[7px] border-[1.5px] border-lime-ink bg-[#11150a]",
              )}
            />
          ))}
          {best && bestText && (
            <span
              style={{ left: pct(best.fx), top: pct(best.fy) }}
              className="tabular absolute -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] font-mono text-[0.71875rem] font-semibold whitespace-nowrap text-foreground"
            >
              {bestText}
            </span>
          )}
        </div>
      </div>

      <span />
      <div aria-hidden className="relative mx-2 h-5">
        {chart.dates.map((d) => (
          <span
            key={d.label + d.anchor}
            style={{ left: pct(d.fx) }}
            className={cn(
              "absolute top-0 text-[0.6875rem] whitespace-nowrap text-foreground-subtle",
              d.anchor === "middle" && "-translate-x-1/2",
              d.anchor === "end" && "-translate-x-full",
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
