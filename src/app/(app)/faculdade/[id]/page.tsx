import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Archive, BookOpen } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { EventSheetProvider } from "@/components/events/event-sheet";
import { SubjectAssessments } from "@/components/faculdade/assessment-rows";
import { AssessmentSheetProvider, NewAssessmentButton } from "@/components/faculdade/assessment-sheet";
import { SubjectClasses } from "@/components/faculdade/subject-classes";
import { SubjectManage } from "@/components/faculdade/subject-manage";
import { Page } from "@/components/layout/page";
import { OriginActions } from "@/components/origins/origin-actions";
import { OriginContext } from "@/components/origins/origin-context";
import { SCHOOL_ICON_CLASS } from "@/components/origins/styles";
import { pastDayTitle, todayIn } from "@/lib/dates";
import { getSubjectPage } from "@/lib/faculdade/pages";
import { MODULES, originHref } from "@/lib/origins/tree";

export const metadata = { title: "Faculdade" };

const hintClass = "text-caption text-foreground-subtle";

function openLabel(n: number): string {
  if (n === 0) return "nada aberto";
  return n === 1 ? "1 ação aberta" : `${n} ações abertas`;
}

function doneLabel(n: number): string {
  return n === 1 ? "1 feita nos últimos 7 dias" : `${n} feitas nos últimos 7 dias`;
}

/** Uma disciplina: avaliações e notas, aulas, contexto e materiais à esquerda; ações do PULSO à direita. */
export default async function DisciplinaPage({ params, searchParams }: PageProps<"/faculdade/[id]">) {
  const { id } = await params;
  const { avaliacao } = await searchParams;
  const page = await getSubjectPage(id);
  if (!page) notFound();
  if (page.node.parentId === null) redirect("/faculdade");

  const { node, path, archived, pending, done, actions, now } = page;
  const today = now.date;
  const crumbs = path.map((area, i) => ({
    label: area.parentId === null ? MODULES[area.module].label : area.name,
    href: i < path.length - 1 ? (originHref(area) ?? undefined) : undefined,
  }));
  const updated = page.notesUpdatedAt ? `Atualizado ${pastDayTitle(todayIn(new Date(page.notesUpdatedAt)), today).toLowerCase()}` : null;
  const linkedCount = Object.fromEntries(Object.entries(page.linked).map(([key, list]) => [key, list.length]));
  const description = [archived ? "Encerrada" : null, page.scheduleLabel, openLabel(actions.length)].filter(Boolean).join(" · ");
  const deleteBlocked =
    pending.length + done.length > 0 ? "Tem avaliações: encerre em vez de apagar." : "Esvazie os subitens antes de apagar.";

  return (
    <EventSheetProvider events={page.events} areas={page.areas} today={today}>
      <AssessmentSheetProvider
        // Um link novo (?avaliacao=) abre a gaveta de novo.
        key={typeof avaliacao === "string" ? avaliacao : "sem-avaliacao"}
        assessments={[...pending, ...done]}
        subjects={page.subjects}
        linked={page.linked}
        today={today}
        defaultSubjectId={node.id}
        initialId={typeof avaliacao === "string" ? avaliacao : undefined}
      >
        <Page
          wide
          icon={BookOpen}
          iconClassName={SCHOOL_ICON_CLASS}
          title={node.name}
          description={description}
          crumbs={crumbs}
          actions={
            <>
              {!archived && <NewAssessmentButton subjectId={node.id} />}
              <SubjectManage node={node} archived={archived} canDelete={page.canDelete} deleteBlocked={deleteBlocked} />
            </>
          }
        >
          {archived && (
            <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-dashed border-border-strong px-4 py-3 text-sm text-foreground-secondary">
              <Archive aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
              Disciplina encerrada — fica guardada com as avaliações e as notas. Para voltar a usar, reabra no “…”.
            </p>
          )}

          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
            <div className="flex min-w-0 flex-col gap-7">
              <section aria-labelledby="disciplina-avaliacoes">
                <SectionHeading id="disciplina-avaliacoes" title="Avaliações" action={<span className={hintClass}>por data</span>} />
                <div className="tint tint-rose p-2 lg:p-2.5">
                  <SubjectAssessments subjectId={node.id} pending={pending} done={done} today={today} linkedCount={linkedCount} canAdd={!archived} />
                </div>
              </section>

              <section aria-labelledby="disciplina-aulas">
                <SectionHeading
                  id="disciplina-aulas"
                  title="Aulas"
                  action={
                    <Link href="/compromissos" className="text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground">
                      Ver em Compromissos
                    </Link>
                  }
                />
                <div className="tint tint-neutral p-2 lg:p-2.5">
                  <SubjectClasses subject={{ id: node.id, name: node.name }} schedule={page.schedule} today={today} canAdd={!archived} />
                </div>
              </section>

              <section aria-labelledby="disciplina-contexto">
                <SectionHeading id="disciplina-contexto" title="Contexto e materiais" action={<span className={hintClass}>salva sozinho</span>} />
                <OriginContext id={node.id} notes={page.notes} updatedLabel={updated} links={page.links} tone="rose" />
              </section>
            </div>

            <section aria-labelledby="disciplina-acoes" className="min-w-0">
              <SectionHeading id="disciplina-acoes" title="Ações no PULSO" action={<span className={hintClass}>por prioridade</span>} />
              <div className="tint tint-neutral p-3 lg:p-4">
                <OriginActions
                  tasks={actions}
                  today={today}
                  addTo={archived ? undefined : { id: node.id, name: node.name }}
                  empty={`Nenhuma ação aberta em ${node.name}.`}
                />
                {page.doneLastWeek > 0 && (
                  <Link href="/feitas" className="block px-1 pt-3 text-caption text-white/55 hover:text-white">
                    {doneLabel(page.doneLastWeek)}
                  </Link>
                )}
              </div>
            </section>
          </div>
        </Page>
      </AssessmentSheetProvider>
    </EventSheetProvider>
  );
}
