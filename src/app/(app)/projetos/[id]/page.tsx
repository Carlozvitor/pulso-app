import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Rocket } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { Page } from "@/components/layout/page";
import { OriginContext } from "@/components/origins/origin-context";
import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectHero } from "@/components/projects/project-hero";
import { PausedNotice, ProjectManage } from "@/components/projects/project-manage";
import { PLUM_ICON_CLASS } from "@/components/projects/styles";
import { pastDayTitle, shortDate, todayIn } from "@/lib/dates";
import { toSummary } from "@/lib/priorities/agora";
import { projectSince } from "@/lib/projects/labels";
import { projectMonogram } from "@/lib/projects/organize";
import { getProject } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/project";

export const metadata = { title: "Projeto" };

/** A aba da tela Projetos onde este projeto aparece (para a trilha voltar no lugar certo). */
const TAB_HREF: Record<ProjectStatus, string> = {
  ACTIVE: "/projetos",
  PAUSED: "/projetos?aba=pausados",
  DONE: "/projetos?aba=concluidos",
  ARCHIVED: "/projetos?aba=arquivados",
};

function statusLine(status: ProjectStatus, since: string): string {
  return status === "ACTIVE" ? `Em andamento · ${since}` : since;
}

/** Um projeto: objetivo, progresso e prazo no topo; contexto (anotação + links) e as ações do PULSO. */
export default async function ProjetoPage({ params }: PageProps<"/projetos/[id]">) {
  const { id } = await params;
  const detail = await getProject(id);
  if (!detail) notFound();

  const { project, areas, openTasks, doneTasks, doneCount } = detail;
  const today = todayIn();
  const since = projectSince(project);
  const paused = project.status === "PAUSED";
  const active = project.status === "ACTIVE";
  const updated = detail.notesUpdatedAt ? `Atualizado ${pastDayTitle(todayIn(new Date(detail.notesUpdatedAt)), today).toLowerCase()}` : null;
  const tasks = openTasks.map((t) => ({ ...toSummary(t, () => null), status: t.status }));

  return (
    <Page
      wide
      icon={Rocket}
      monogram={projectMonogram(project.name)}
      iconClassName={PLUM_ICON_CLASS}
      title={project.name}
      description={statusLine(project.status, since)}
      crumbs={[{ label: "Projetos", href: TAB_HREF[project.status] }, { label: project.name }]}
      actions={<ProjectManage projectId={project.id} name={project.name} status={project.status} openCount={openTasks.length} />}
    >
      {paused && <PausedNotice projectId={project.id} since={since} openCount={openTasks.length} />}

      {/* Sem key por dados do projeto: o salvamento automático não pode remontar o campo no meio da edição. */}
      <ProjectHero project={project} areas={areas} today={today} />

      <div className="mt-7 grid items-start gap-7 lg:mt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
        <section aria-labelledby="projeto-contexto">
          <SectionHeading id="projeto-contexto" title="Contexto" action={<span className="text-caption text-foreground-subtle">salva sozinho</span>} />
          <OriginContext id={project.id} owner="project" tone="plum" notes={detail.notes} updatedLabel={updated} links={detail.links} />
        </section>

        <section aria-labelledby="projeto-acoes">
          <SectionHeading
            id="projeto-acoes"
            title={paused ? "Ações guardadas" : active ? "Próximas ações no PULSO" : "Ações"}
            action={<span className="text-caption text-foreground-subtle">{paused ? "voltam ao retomar" : "por prioridade"}</span>}
          />
          <div className={cn("tint tint-neutral p-3 lg:p-4", paused && "opacity-75")}>
            <ProjectActions
              projectId={project.id}
              name={project.name}
              tasks={tasks}
              today={today}
              canAdd={active}
              empty={active ? `Nenhuma ação aberta em ${project.name}. Anote a próxima aqui em cima.` : "Nenhuma ação aberta."}
            />

            {doneCount > 0 && (
              <details className="group mt-3">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 px-1 text-caption text-white/55 transition-colors duration-(--duration-fast) hover:text-white [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 transition-transform duration-(--duration-fast) group-open:rotate-90"
                    strokeWidth={1.75}
                  />
                  {doneCount === 1 ? "1 feita" : `${doneCount} feitas`}
                  <span className="group-open:hidden">· ver</span>
                </summary>
                <ul className="mt-1 grid gap-0.5">
                  {doneTasks.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/tarefas/${task.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-(--duration-fast) hover:bg-black/25"
                      >
                        <Check aria-hidden className="size-4 shrink-0 text-success" strokeWidth={2} />
                        <span className="min-w-0 flex-1 truncate text-sm text-white/70">{task.title}</span>
                        {task.completedAt && (
                          <span className="tabular shrink-0 text-caption text-white/45">{shortDate(todayIn(new Date(task.completedAt)))}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                {doneCount > doneTasks.length && (
                  <p className="px-3 pt-2 text-caption text-white/45">
                    Mostrando as {doneTasks.length} mais recentes. As outras estão em{" "}
                    <Link href="/feitas" className="underline underline-offset-2 hover:text-white">
                      Feitas
                    </Link>
                    .
                  </p>
                )}
              </details>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
