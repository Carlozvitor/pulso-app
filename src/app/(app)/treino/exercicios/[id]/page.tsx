import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Dumbbell, Trophy } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { Page } from "@/components/layout/page";
import { TRAINING_ICON_CLASS } from "@/components/origins/styles";
import { GoalBar } from "@/components/treino/evolution-list";
import { ExerciseChart } from "@/components/treino/exercise-chart";
import { ExerciseManage } from "@/components/treino/exercise-manage";
import { pastDayTitle, shortDate } from "@/lib/dates";
import { KIND_LABEL, KIND_UNIT, formatNumber, formatValues, metricOf } from "@/lib/treino/format";
import { getExercisePage } from "@/lib/treino/pages";
import type { WorkoutEntry, WorkoutExercise } from "@/types/workout";
import { cn } from "@/lib/utils";

export const metadata = { title: "Exercício" };

/** Melhor marca, curta: "45 kg × 6" · "3×20" · "40 min". */
function bestLabel(exercise: WorkoutExercise, entry: WorkoutEntry): string {
  if (exercise.kind === "LOAD" && entry.loadKg) return entry.reps ? `${formatNumber(entry.loadKg)} kg × ${entry.reps}` : `${formatNumber(entry.loadKg)} kg`;
  return formatValues(exercise.kind, entry);
}

function registrosLabel(n: number): string {
  if (n === 0) return "nenhum registro ainda";
  return n === 1 ? "1 registro" : `${n} registros`;
}

const dayText = (date: string, today: string) => pastDayTitle(date, today).toLocaleLowerCase("pt-BR");

/** Um exercício: como começou, a última vez, a melhor marca, a meta, o gráfico e os registros. */
export default async function ExercicioPage({ params }: PageProps<"/treino/exercicios/[id]">) {
  const { id } = await params;
  const page = await getExercisePage(id);
  if (!page) notFound();

  const { summary, records, chart, today } = page;
  const { exercise, first, last, best, change, goal } = summary;
  const unit = KIND_UNIT[exercise.kind];
  const since = first ? `desde ${shortDate(first.session.date)}` : null;
  const chartLabel =
    first && last
      ? `${KIND_LABEL[exercise.kind]} de ${exercise.name}: ${formatNumber(metricOf(exercise.kind, first.entry) ?? 0)} ${unit} em ${shortDate(first.session.date)}, ${formatNumber(metricOf(exercise.kind, last.entry) ?? 0)} ${unit} em ${shortDate(last.session.date)}${best ? `; melhor marca ${bestLabel(exercise, best.entry)}` : ""}.`
      : exercise.name;

  return (
    <Page
      wide
      icon={Dumbbell}
      iconClassName={TRAINING_ICON_CLASS}
      title={exercise.name}
      description={[KIND_LABEL[exercise.kind], registrosLabel(summary.count), since, exercise.archivedAt ? "guardado" : null].filter(Boolean).join(" · ")}
      crumbs={[{ label: "Treino", href: "/treino" }, { label: "Exercícios", href: "/treino/exercicios" }, { label: exercise.name }]}
    >
      {last ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div className="tint tint-lime grid content-start gap-1 p-4 lg:px-5">
            <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-white/55 uppercase">Última vez</span>
            <span className="tabular text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.375rem]">{formatValues(exercise.kind, last.entry)}</span>
            <span className="text-caption text-white/62">{dayText(last.session.date, today)}</span>
          </div>
          <div className="tint tint-neutral grid content-start gap-1 p-4 lg:px-5">
            <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-foreground-subtle uppercase">No começo</span>
            <span className="tabular text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.375rem]">{first ? formatValues(exercise.kind, first.entry) : "–"}</span>
            <span className="text-caption text-foreground-secondary">
              {first ? shortDate(first.session.date) : ""}
              {change && change.direction !== "same" && (
                <>
                  {" · "}
                  <span className={cn("tabular font-mono font-semibold", change.direction === "up" ? "text-lime-ink" : "text-foreground-secondary")}>{change.label}</span>
                </>
              )}
            </span>
          </div>
          <div className="tint tint-neutral grid content-start gap-1 p-4 lg:px-5">
            <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-foreground-subtle uppercase">Melhor marca</span>
            <span className="tabular text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.375rem]">{best ? bestLabel(exercise, best.entry) : "–"}</span>
            <span className="text-caption text-foreground-secondary">{best ? dayText(best.session.date, today) : ""}</span>
          </div>
          <div className="tint tint-neutral grid content-start gap-1 p-4 lg:px-5">
            <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-foreground-subtle uppercase">Meta</span>
            <span className="tabular text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.375rem]">{goal ? `${formatNumber(goal.target)} ${unit}` : "Sem meta"}</span>
            {goal ? <GoalBar summary={summary} /> : <span className="text-caption text-foreground-secondary">Defina ao lado, se quiser.</span>}
          </div>
        </div>
      ) : (
        <p className="panel px-4 py-5 text-sm text-foreground-secondary">
          Ainda sem registro. Depois do primeiro treino com {exercise.name}, aqui aparecem a última vez, a melhor marca e a evolução.
        </p>
      )}

      {chart && (
        <section aria-labelledby="exercicio-grafico" className="mt-8 lg:mt-9">
          <SectionHeading
            id="exercicio-grafico"
            title={exercise.kind === "LOAD" ? "Carga ao longo do tempo" : exercise.kind === "TIME" ? "Minutos ao longo do tempo" : "Repetições ao longo do tempo"}
            action={<span className="text-caption text-foreground-subtle">cada ponto é um treino</span>}
          />
          <div className="tint tint-neutral px-3 pt-3 pb-2 lg:px-5 lg:pt-4">
            <ExerciseChart chart={chart} kind={exercise.kind} bestText={best ? bestLabel(exercise, best.entry) : null} label={chartLabel} />
          </div>
        </section>
      )}

      <div className="mt-8 grid items-start gap-7 lg:mt-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-5">
        <section aria-labelledby="exercicio-registros">
          <SectionHeading id="exercicio-registros" title="Registros" action={<span className="text-caption text-foreground-subtle">do mais novo ao mais antigo</span>} />
          {records.length > 0 ? (
            <div className="tint tint-neutral p-1.5 lg:p-2">
              <ul className="divide-y divide-border">
                {records.map((record) => (
                  <li key={record.sessionId}>
                    <Link
                      href={`/treino/fazer/${record.sessionId}`}
                      className="flex min-h-13 items-center gap-3 px-2.5 py-2 transition-colors duration-(--duration-fast) hover:bg-white/4"
                    >
                      <span className="w-28 shrink-0 text-caption text-foreground-secondary">{dayText(record.date, today)}</span>
                      <span className="tabular flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm font-medium">
                        {record.label}
                        {record.best && (
                          <span className="inline-flex items-center gap-1 rounded-[5px] bg-lime-ink/12 px-1.5 py-px text-[0.6875rem] font-semibold text-lime-ink">
                            <Trophy aria-hidden className="size-3" strokeWidth={2} />
                            melhor marca
                          </span>
                        )}
                        {!record.best && record.change?.direction === "up" && (
                          <span className="tabular font-mono text-xs font-semibold text-lime-ink">{record.change.label}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-caption text-foreground-subtle">
                        ver treino
                        <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.75} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="px-2.5 pt-2 pb-1 text-caption text-foreground-subtle">Para corrigir um número, abra o treino daquele dia.</p>
            </div>
          ) : (
            <p className="panel px-4 py-5 text-sm text-foreground-secondary">Nenhum registro ainda.</p>
          )}
          {page.plans.length > 0 && (
            <p className="mt-3 text-caption text-foreground-subtle">
              Nas fichas:{" "}
              {page.plans.map((plan, i) => (
                <span key={plan.id}>
                  {i > 0 && ", "}
                  <Link href={`/treino/fichas/${plan.id}`} className="text-foreground-secondary underline-offset-4 hover:underline">
                    {plan.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>

        <aside aria-labelledby="exercicio-opcoes">
          <SectionHeading id="exercicio-opcoes" title="Meta e opções" />
          <ExerciseManage exercise={exercise} />
        </aside>
      </div>
    </Page>
  );
}
