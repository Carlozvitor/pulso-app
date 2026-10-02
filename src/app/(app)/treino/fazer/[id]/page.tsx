import { notFound } from "next/navigation";
import { CircleCheck, Dumbbell } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { Page, Pill } from "@/components/layout/page";
import { TRAINING_ICON_CLASS } from "@/components/origins/styles";
import { SavePlanButton } from "@/components/treino/plan-manage";
import { DiscardButton, FinishButton, WorkoutDateField } from "@/components/treino/workout-actions";
import { WorkoutEntries } from "@/components/treino/workout-entries";
import { timeLabel } from "@/lib/dates";
import { exercisesLabel } from "@/lib/treino/format";
import { getWorkoutPage } from "@/lib/treino/pages";

export const metadata = { title: "Treino" };

/** Um treino: em andamento (marcar, ajustar, concluir) ou concluído (corrigir números). */
export default async function TreinoFazerPage({ params }: PageProps<"/treino/fazer/[id]">) {
  const { id } = await params;
  const page = await getWorkoutPage(id);
  if (!page) notFound();

  const { session, summary, rows, today } = page;
  const inProgress = session.finishedAt === null;
  const started = timeLabel(new Date(session.startedAt));
  const description = inProgress
    ? `começou ${started} · salva sozinho`
    : `concluído · ${exercisesLabel(summary.done)}${page.plan ? ` · ${page.plan.name}` : ""}`;
  const percent = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;

  return (
    <Page
      wide
      icon={Dumbbell}
      iconClassName={TRAINING_ICON_CLASS}
      title={page.title}
      description={description}
      crumbs={[{ label: "Treino", href: "/treino" }, { label: page.title }]}
      actions={
        <>
          <SavePlanButton sessionId={session.id} suggestedName={page.suggestedPlanName} disabled={rows.length === 0} />
          {inProgress ? (
            <FinishButton sessionId={session.id} />
          ) : (
            <Pill icon={CircleCheck}>Concluído</Pill>
          )}
        </>
      }
    >
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-5">
        <section aria-labelledby="treino-exercicios">
          <SectionHeading
            id="treino-exercicios"
            title="Exercícios"
            action={<span className="text-caption text-foreground-subtle">{inProgress ? "tracejado = como da última vez" : "corrija o que precisar"}</span>}
          />
          <div className="tint tint-lime p-2 lg:p-2.5">
            <WorkoutEntries sessionId={session.id} rows={rows} catalog={page.catalog} today={today} />
          </div>
          {inProgress && (
            <div className="mt-4 lg:hidden">
              <FinishButton sessionId={session.id} full />
            </div>
          )}
        </section>

        <aside aria-labelledby="treino-resumo">
          <SectionHeading id="treino-resumo" title="Resumo" />
          <div className="tint tint-neutral grid gap-4 p-4 lg:p-5">
            <div>
              <p className="flex items-baseline gap-2">
                <span className="tabular text-[1.875rem] leading-none font-bold tracking-tight">{summary.done}</span>
                <span className="text-sm text-foreground-secondary">de {summary.total} feitos</span>
              </p>
              <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-lime-ink" style={{ width: `${percent}%` }} />
              </div>
            </div>

            <dl className="grid border-t border-border text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
                <dt className="text-foreground-secondary">Começou</dt>
                <dd className="tabular font-medium">{started}</dd>
              </div>
              {page.plan && (
                <div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
                  <dt className="text-foreground-secondary">Ficha</dt>
                  <dd className="truncate font-medium">{page.plan.name}</dd>
                </div>
              )}
              {page.ups.length > 0 && (
                <div className="flex items-start justify-between gap-3 border-b border-border py-2.5">
                  <dt className="text-foreground-secondary">Subiu</dt>
                  <dd className="grid justify-items-end gap-0.5 text-right">
                    {page.ups.map((up) => (
                      <span key={up.name} className="text-caption">
                        {up.name} <span className="tabular font-mono font-semibold text-lime-ink">{up.change.label}</span>
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <div className="grid gap-1.5">
              <span className="text-caption text-foreground-subtle">Dia do treino</span>
              <WorkoutDateField sessionId={session.id} date={session.date} today={today} />
            </div>

            <p className="text-caption leading-relaxed text-foreground-subtle">
              {inProgress
                ? "Concluir guarda só os exercícios marcados. Se fechar a tela, o treino continua salvo e aparece em Treino de hoje até você concluir."
                : "Desmarcar um exercício tira ele da conta (frequência e evolução). O × aparece depois de desmarcar."}
            </p>
            <DiscardButton sessionId={session.id} finished={!inProgress} />
          </div>
        </aside>
      </div>
    </Page>
  );
}
