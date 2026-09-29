import Link from "next/link";
import { CalendarDays, CircleDot, Leaf } from "lucide-react";
import { AreaFilter } from "@/components/agora/area-filter";
import { NowCard } from "@/components/agora/now-card";
import { TaskCard } from "@/components/agora/task-card";
import { DayCard } from "@/components/agenda/day-card";
import { CardTile, SectionHeading } from "@/components/cards/card-parts";
import { Page, Pill } from "@/components/layout/page";
import { SearchBox } from "@/components/navigation/search-box";
import { ProjectCard } from "@/components/projects/project-card";
import { SessionEntry } from "@/components/session/session-entry";
import { datePill, timeLabel } from "@/lib/dates";
import { compareProjects } from "@/lib/projects/organize";
import { listAreas, listProjects } from "@/lib/projects/queries";
import { getActiveSession } from "@/lib/sessions/queries";
import { pendingLabel } from "@/lib/tasks/format";
import { getAgoraPage } from "@/lib/tasks/queries";

export const metadata = { title: "Agora" };

/** Quantos projetos aparecem na Agora (o resto fica em Projetos). */
const PROJECTS_ON_AGORA = 4;

const linkClass = "text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground";

export default async function AgoraPage({ searchParams }: PageProps<"/agora">) {
  const { area } = await searchParams;
  const [areas, { groups }, session] = await Promise.all([listAreas(), listProjects(), getActiveSession()]);
  // Só vale filtro de área que existe — id inválido na URL cai em "Tudo".
  const selected = typeof area === "string" && areas.some((a) => a.id === area) ? area : null;
  const { view, upcoming } = await getAgoraPage(selected);

  const projects = groups
    .flatMap((g) => g.projects)
    .filter((p) => !selected || p.areaId === selected)
    .sort(compareProjects)
    .slice(0, PROJECTS_ON_AGORA);
  const areaName = areas.find((a) => a.id === selected)?.name;
  const inboxOnly = !view.now && view.pendingCount > 0;

  return (
    <Page
      wide
      icon={CircleDot}
      title="Agora"
      description={areaName ? `O que merece atenção em ${areaName}` : (pendingLabel(view.pendingCount) ?? "O que merece sua atenção")}
      actions={
        <>
          <Pill icon={CalendarDays}>{datePill(view.today)}</Pill>
          {session ? (
            <Pill tone="live" href="/sessao">
              Sessão até {timeLabel(new Date(session.endsAt))}
            </Pill>
          ) : (
            view.now?.status === "IN_PROGRESS" && <Pill tone="live">Em andamento</Pill>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5 lg:gap-6">
        <SearchBox />
        <AreaFilter areas={areas} selected={selected} />
      </div>

      <section aria-labelledby="agora-e-depois" className="mt-8 lg:mt-9">
        <SectionHeading id="agora-e-depois" title="Agora e depois" />
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
          {view.now ? (
            <>
              <NowCard task={view.now} today={view.today} />
              {view.next.map((task) => (
                <TaskCard key={task.id} task={task} today={view.today} tone="teal" note={task.paused ? "Pausada" : "Depois"} />
              ))}
              {view.later.map((task) => (
                <TaskCard key={task.id} task={task} today={view.today} tone="neutral" note="Mais tarde" />
              ))}
            </>
          ) : (
            <div className="tint tint-teal flex flex-col p-5 sm:col-span-2 lg:p-6">
              <CardTile icon={Leaf} />
              <p className="mt-5 text-[1.375rem] leading-tight font-semibold tracking-tight">
                Nada pedindo sua atenção agora.
              </p>
              <p className="mt-1 max-w-md text-sm text-white/70">
                {inboxOnly
                  ? "Há itens na Inbox para organizar. Quando algo estiver pronto para fazer, aparece aqui."
                  : "Quando lembrar de algo, anote — vira tarefa a fazer na hora."}
              </p>
            </div>
          )}
        </div>
        <div className="lg:hidden">
          <SessionEntry activeEndsAt={session?.endsAt ?? null} />
        </div>
      </section>

      {projects.length > 0 && (
        <section aria-labelledby="agora-projetos" className="mt-8 lg:mt-9">
          <SectionHeading
            id="agora-projetos"
            title="Projetos"
            action={
              <Link href="/projetos" className={linkClass}>
                Todos os projetos
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} today={view.today} compact />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="agora-dias" className="mt-8 lg:mt-9">
        <SectionHeading
          id="agora-dias"
          title="Próximos dias"
          action={
            <Link href="/agenda" className={linkClass}>
              Abrir agenda
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
          {upcoming.map((bucket) => (
            <DayCard key={bucket.key} bucket={bucket} />
          ))}
        </div>
      </section>
    </Page>
  );
}
