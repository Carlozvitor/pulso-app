import Link from "next/link";
import { notFound } from "next/navigation";
import { Dumbbell, List, Play } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { EventSheetProvider } from "@/components/events/event-sheet";
import { Page } from "@/components/layout/page";
import { OriginActions } from "@/components/origins/origin-actions";
import { OriginContext } from "@/components/origins/origin-context";
import { TRAINING_ICON_CLASS } from "@/components/origins/styles";
import { EvolutionList } from "@/components/treino/evolution-list";
import { FrequencyCard } from "@/components/treino/frequency-card";
import { GoalButton } from "@/components/treino/goal-button";
import { PlanList } from "@/components/treino/plan-list";
import { SessionRows } from "@/components/treino/session-rows";
import { StartButton } from "@/components/treino/start-buttons";
import { limeButton, quietButton } from "@/components/treino/styles";
import { TodayCard } from "@/components/treino/today-card";
import { datePill, pastDayTitle, todayIn } from "@/lib/dates";
import { getTreinoPage } from "@/lib/treino/pages";
import { suggestPlanName } from "@/lib/treino/summary";

export const metadata = { title: "Treino" };

const linkClass = "text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground";

/** Módulo Treino: o treino de hoje, a frequência, a evolução por exercício, os últimos treinos e as fichas. */
export default async function TreinoPage() {
  const page = await getTreinoPage();
  if (!page) notFound();
  const { root, context, now, frequency } = page;
  const today = now.date;
  const nextPlan = page.plans.find((p) => p.next) ?? null;
  const hidden = page.openActions - page.actions.length;
  const updated = context.notesUpdatedAt
    ? `Atualizado ${pastDayTitle(todayIn(new Date(context.notesUpdatedAt)), today).toLocaleLowerCase("pt-BR")}`
    : null;

  return (
    <EventSheetProvider events={page.events} areas={page.areas} today={today}>
      <Page
        wide
        icon={Dumbbell}
        iconClassName={TRAINING_ICON_CLASS}
        title="Treino"
        description="O que você fez e se está evoluindo. As ações ficam no PULSO."
        actions={
          <>
            <Link href="/treino/exercicios" className={quietButton}>
              <List aria-hidden strokeWidth={1.75} />
              Exercícios
            </Link>
            {page.open ? (
              <Link href={`/treino/fazer/${page.open.session.id}`} className={limeButton}>
                <Play aria-hidden strokeWidth={2} />
                Continuar treino
              </Link>
            ) : (
              <StartButton input={{ from: "empty" }} label="Registrar treino" variant="header" />
            )}
          </>
        }
      >
        <div className="grid gap-7 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-5">
          <section aria-labelledby="treino-hoje" className="flex flex-col">
            <SectionHeading id="treino-hoje" title="Hoje" action={<span className="text-caption text-foreground-subtle">{datePill(today)}</span>} />
            <TodayCard
              open={page.open}
              todayDone={page.todayDone}
              last={page.last}
              nextPlan={nextPlan}
              repeatable={page.repeatable}
              academy={page.academy}
              hasSchedule={page.hasSchedule}
              rootId={root.id}
              today={today}
            />
          </section>
          <section aria-labelledby="treino-frequencia" className="flex flex-col">
            <SectionHeading id="treino-frequencia" title="Frequência" action={<GoalButton goal={frequency.goal} />} />
            <FrequencyCard frequency={frequency} />
          </section>
        </div>

        <section aria-labelledby="treino-evolucao" className="mt-8 lg:mt-9">
          <SectionHeading
            id="treino-evolucao"
            title="Evolução por exercício"
            action={
              page.exerciseCount > 0 && (
                <Link href="/treino/exercicios" className={linkClass}>
                  {page.exerciseCount === 1 ? "Ver o exercício" : `Ver os ${page.exerciseCount} exercícios`}
                </Link>
              )
            }
          />
          <div className="tint tint-lime p-2 lg:p-2.5">
            <EvolutionList
              items={page.evolution}
              today={today}
              empty="A evolução aparece depois do primeiro treino: cada exercício mostra a última vez e quanto mudou desde o começo."
            />
          </div>
        </section>

        <div className="mt-8 grid items-start gap-7 lg:mt-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-5">
          <section aria-labelledby="treino-ultimos">
            <SectionHeading
              id="treino-ultimos"
              title="Últimos treinos"
              action={
                page.recent.length > 0 && (
                  <Link href="/treino/historico" className={linkClass}>
                    Histórico completo
                  </Link>
                )
              }
            />
            <div className="tint tint-neutral p-1.5 lg:p-2">
              <SessionRows sessions={page.recent} today={today} empty="Nenhum treino ainda. O primeiro que você registrar aparece aqui." />
            </div>
          </section>
          <section aria-labelledby="treino-fichas">
            <SectionHeading id="treino-fichas" title="Fichas" action={<span className="text-caption text-foreground-subtle">opcional</span>} />
            <PlanList plans={page.plans} suggestedName={suggestPlanName(page.plans.map((p) => p.plan))} />
          </section>
        </div>

        <div className="mt-8 grid items-start gap-7 lg:mt-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-5">
          <section aria-labelledby="treino-acoes">
            <SectionHeading
              id="treino-acoes"
              title="Ações em Treino"
              action={
                <Link href={`/agora?area=${root.id}`} className={linkClass}>
                  Ver na Agora
                </Link>
              }
            />
            <div className="tint tint-neutral p-3 lg:p-4">
              <OriginActions
                tasks={page.actions}
                today={today}
                addTo={{ id: root.id, name: "Treino", placeholder: "Nova ação (ex.: Comprar whey)" }}
                empty="Nenhuma ação aberta no Treino agora."
              />
              {hidden > 0 && (
                <Link href={`/agora?area=${root.id}`} className="block px-3 pt-3 text-caption text-white/55 hover:text-white">
                  e mais {hidden} na Agora
                </Link>
              )}
            </div>
          </section>
          <section aria-labelledby="treino-contexto">
            <SectionHeading id="treino-contexto" title="Anotação e links" action={<span className="text-caption text-foreground-subtle">salva sozinho</span>} />
            <OriginContext id={root.id} notes={context.notes} updatedLabel={updated} links={context.links} tone="lime" />
          </section>
        </div>
      </Page>
    </EventSheetProvider>
  );
}
