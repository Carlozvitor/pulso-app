import { CalendarDays, CircleDot, Leaf } from "lucide-react";
import { AreaFilter } from "@/components/agora/area-filter";
import { NowCard } from "@/components/agora/now-card";
import { TaskCard } from "@/components/agora/task-card";
import { CardTile, SectionHeading } from "@/components/cards/card-parts";
import { Page, Pill } from "@/components/layout/page";
import { SearchBox } from "@/components/navigation/search-box";
import { SessionEntry } from "@/components/session/session-entry";
import { datePill, timeLabel } from "@/lib/dates";
import { listAreas } from "@/lib/projects/queries";
import { getActiveSession } from "@/lib/sessions/queries";
import { pendingLabel } from "@/lib/tasks/format";
import { getAgoraView, listOpenTasks } from "@/lib/tasks/queries";
import { openCounts } from "@/lib/origins/summary";
import { MODULES, buildOriginTree } from "@/lib/origins/tree";
import type { Area } from "@/types/project";

export const metadata = { title: "Agora" };

export default async function AgoraPage({ searchParams }: PageProps<"/agora">) {
  const { area } = await searchParams;
  const [areas, open, session] = await Promise.all([listAreas(), listOpenTasks(), getActiveSession()]);
  // Só vale filtro de origem que existe — id inválido na URL cai em "Tudo".
  const selected = typeof area === "string" && areas.some((a) => a.id === area) ? area : null;
  const view = await getAgoraView(selected);
  const counts = openCounts(areas, open);
  const nameOf = (a: Area) => (a.parentId === null ? MODULES[a.module].label : a.name);
  // Módulos com algo aberto (ou o escolhido) + o item escolhido, se for mais fundo.
  const filters = [
    ...buildOriginTree(areas).filter((root) => (counts.get(root.id) ?? 0) > 0 || root.id === selected),
    ...areas.filter((a) => a.id === selected && a.parentId !== null),
  ].map((a) => ({ id: a.id, name: nameOf(a) }));
  const selectedArea = areas.find((a) => a.id === selected);
  const areaName = selectedArea ? nameOf(selectedArea) : undefined;
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
        <AreaFilter options={filters} selected={selected} />
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
    </Page>
  );
}
