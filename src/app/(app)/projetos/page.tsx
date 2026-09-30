import Link from "next/link";
import { ArrowDownUp, Archive, CircleCheck, Pause, Rocket } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListPanel, Page } from "@/components/layout/page";
import { NewProject } from "@/components/projects/new-project";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectRow } from "@/components/projects/project-row";
import { PLUM_ICON_CLASS } from "@/components/projects/styles";
import { listAreas, listProjects } from "@/lib/projects/queries";
import { todayIn } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ProjectLists } from "@/types/project";

export const metadata = { title: "Projetos" };

/** As abas, na ordem da tela. A primeira é o padrão (sem ?aba=). */
const TABS = [
  { key: "andamento", label: "Em andamento", list: "active" },
  { key: "pausados", label: "Pausados", list: "paused" },
  { key: "concluidos", label: "Concluídos", list: "done" },
  { key: "arquivados", label: "Arquivados", list: "archived" },
] as const satisfies readonly { key: string; label: string; list: keyof ProjectLists }[];

type Tab = (typeof TABS)[number];

const EMPTY: Record<Tab["list"], { icon: typeof Rocket; title: string; description: string }> = {
  active: {
    icon: Rocket,
    title: "Nenhum projeto em andamento.",
    description: "Projetos guardam trabalhos maiores. As ações de cada um ficam no PULSO.",
  },
  paused: {
    icon: Pause,
    title: "Nenhum projeto pausado.",
    description: "Pausar guarda um projeto sem apagar nada: as ações saem da Agora até você retomar.",
  },
  done: { icon: CircleCheck, title: "Nenhum projeto concluído ainda.", description: "Ao concluir um projeto, ele fica guardado aqui." },
  archived: { icon: Archive, title: "Nada arquivado.", description: "Projeto que não vai mais acontecer pode ser arquivado." },
};

function hrefFor(tab: Tab): string {
  return tab.key === "andamento" ? "/projetos" : `/projetos?aba=${tab.key}`;
}

function subtitle(lists: ProjectLists): string {
  const parts = [`${lists.active.length} em andamento`];
  if (lists.paused.length > 0) parts.push(lists.paused.length === 1 ? "1 pausado" : `${lists.paused.length} pausados`);
  return parts.join(" · ");
}

/** Projetos: abas por status. Em andamento e pausados em cards; concluídos e arquivados em lista. */
export default async function ProjetosPage({ searchParams }: PageProps<"/projetos">) {
  const { aba } = await searchParams;
  const [lists, areas] = await Promise.all([listProjects(), listAreas()]);
  const today = todayIn();
  const tab = TABS.find((t) => t.key === aba) ?? TABS[0];
  const projects = lists[tab.list];
  const empty = EMPTY[tab.list];
  const cards = tab.list === "active" || tab.list === "paused";

  return (
    <Page
      wide
      icon={Rocket}
      iconClassName={PLUM_ICON_CLASS}
      title="Projetos"
      description={subtitle(lists)}
      actions={<NewProject areas={areas} today={today} variant="inline" />}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <nav aria-label="Status dos projetos" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex w-max gap-1 rounded-[10px] border border-border bg-[#0a0a0c] p-1">
            {TABS.map((t) => {
              const on = t.key === tab.key;
              return (
                <li key={t.key}>
                  <Link
                    href={hrefFor(t)}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-[7px] px-3 text-sm whitespace-nowrap transition-colors duration-(--duration-fast)",
                      on ? "bg-[#1b1c24] text-foreground shadow-[inset_0_0_0_1px_#2b2d40]" : "text-foreground-secondary hover:text-foreground",
                    )}
                  >
                    {t.label}
                    <span className={cn("tabular font-mono text-[0.71875rem] font-semibold", on ? "text-plum-ink" : "text-foreground-subtle")}>
                      {lists[t.list].length}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {tab.list === "active" && projects.length > 1 && (
          <p className="hidden items-center gap-1.5 text-sm text-foreground-subtle sm:flex">
            <ArrowDownUp aria-hidden className="size-3.5" strokeWidth={1.75} />
            Prazo mais perto primeiro
          </p>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description}>
          {tab.list === "active" && <NewProject areas={areas} today={today} variant="inline" />}
        </EmptyState>
      ) : cards ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} today={today} />
          ))}
          {tab.list === "active" && <NewProject areas={areas} today={today} variant="card" />}
        </div>
      ) : (
        <ListPanel className="lg:max-w-3xl">
          <ul className="divide-y divide-border">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectRow project={project} />
              </li>
            ))}
          </ul>
        </ListPanel>
      )}
    </Page>
  );
}
