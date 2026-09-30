import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ChevronRight, GraduationCap } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { UpcomingAssessments } from "@/components/faculdade/assessment-rows";
import { AssessmentSheetProvider, NewAssessmentButton } from "@/components/faculdade/assessment-sheet";
import { SubjectCard } from "@/components/faculdade/subject-card";
import { NewSubjectButton } from "@/components/faculdade/subject-manage";
import { WeekClasses } from "@/components/faculdade/week-classes";
import { Page } from "@/components/layout/page";
import { OriginActions } from "@/components/origins/origin-actions";
import { SCHOOL_ICON_CLASS } from "@/components/origins/styles";
import { getFaculdadePage } from "@/lib/faculdade/pages";

export const metadata = { title: "Faculdade" };

const linkClass = "text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground";

/** Módulo Faculdade: avaliações que vêm aí, aulas da semana, disciplinas e as ações do PULSO que vêm delas. */
export default async function FaculdadePage() {
  const page = await getFaculdadePage();
  if (!page) notFound();
  const { root, subjects, closed, upcoming, week, actions, open, linked, names, now } = page;
  const today = now.date;
  const linkedCount = Object.fromEntries(Object.entries(linked).map(([id, list]) => [id, list.length]));
  const hidden = open - actions.length;

  const weekSection = (id: string) => (
    <section aria-labelledby={id}>
      <SectionHeading
        id={id}
        title="Aulas desta semana"
        action={
          <Link href="/compromissos" className={linkClass}>
            Ver em Compromissos
          </Link>
        }
      />
      <div className="tint tint-neutral p-2 lg:p-2.5">
        <WeekClasses week={week} today={today} />
      </div>
    </section>
  );

  return (
    <AssessmentSheetProvider assessments={upcoming} subjects={subjects.map((s) => s.node)} linked={linked} today={today}>
      <Page
        wide
        icon={GraduationCap}
        iconClassName={SCHOOL_ICON_CLASS}
        title="Faculdade"
        description="Onde fica o contexto acadêmico. As ações ficam no PULSO."
        actions={
          <>
            <NewSubjectButton rootId={root.id} />
            {subjects.length > 0 && <NewAssessmentButton />}
          </>
        }
      >
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-5">
          <section aria-labelledby="faculdade-proximas">
            <SectionHeading id="faculdade-proximas" title="Próximas avaliações" action={<span className="text-caption text-foreground-subtle">por data</span>} />
            <div className="tint tint-rose p-2 lg:p-2.5">
              <UpcomingAssessments items={upcoming} today={today} names={names} linkedCount={linkedCount} />
            </div>
          </section>
          {/* No celular a semana vem depois das disciplinas. */}
          <div className="hidden lg:block">{weekSection("faculdade-semana")}</div>
        </div>

        <section aria-labelledby="faculdade-disciplinas" className="mt-8 lg:mt-9">
          <SectionHeading id="faculdade-disciplinas" title="Disciplinas" />
          {subjects.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2 lg:gap-5">
              {subjects.map((subject) => (
                <SubjectCard key={subject.node.id} subject={subject} today={today} />
              ))}
            </div>
          ) : (
            <p className="panel px-4 py-5 text-sm text-foreground-secondary">
              Nenhuma disciplina ainda. Comece por “Nova disciplina” — depois é só anotar as aulas e as avaliações de cada uma.
            </p>
          )}

          {closed.length > 0 && (
            <details className="group mt-3 rounded-xl border border-dashed border-border-strong">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-4 text-sm text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground [&::-webkit-details-marker]:hidden">
                <Archive aria-hidden className="size-4" strokeWidth={1.75} />
                <span className="flex-1">Disciplinas encerradas</span>
                <span className="tabular font-mono text-xs font-semibold">{closed.length}</span>
                <ChevronRight aria-hidden className="size-4 transition-transform duration-(--duration-fast) group-open:rotate-90" strokeWidth={1.75} />
              </summary>
              <ul className="grid gap-0.5 px-2 pb-2">
                {closed.map((area) => (
                  <li key={area.id}>
                    <Link
                      href={`/faculdade/${area.id}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2.5 text-sm text-foreground-secondary transition-colors duration-(--duration-fast) hover:bg-white/5 hover:text-foreground"
                    >
                      {area.name}
                      <ChevronRight aria-hidden className="size-4 text-muted-ui" strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <div className="mt-8 lg:hidden">{weekSection("faculdade-semana-celular")}</div>

        <section aria-labelledby="faculdade-acoes" className="mt-8 lg:mt-9">
          <SectionHeading
            id="faculdade-acoes"
            title="Ações em Faculdade"
            action={
              <Link href={`/agora?area=${root.id}`} className={linkClass}>
                Ver na Agora
              </Link>
            }
          />
          <div className="tint tint-neutral p-3 lg:p-4">
            <OriginActions tasks={actions} today={today} empty="Nenhuma ação aberta na Faculdade agora." />
            {hidden > 0 && (
              <Link href={`/agora?area=${root.id}`} className="block px-3 pt-3 text-caption text-white/55 hover:text-white">
                e mais {hidden} na Agora
              </Link>
            )}
          </div>
        </section>
      </Page>
    </AssessmentSheetProvider>
  );
}
