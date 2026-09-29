"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleCheck, CircleDot, Inbox, Layers, ListTodo, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarProject = { id: string; name: string; monogram: string; areaName: string | null; open: number };
export type SidebarArea = { id: string; name: string };

type Tab = "tudo" | "projetos" | "areas";

type ItemProps = {
  href: string;
  title: string;
  subtitle?: string;
  count?: number;
  active: boolean;
  tile: { className: string; icon?: LucideIcon; text?: string };
};

function Item({ href, title, subtitle, count, active, tile }: ItemProps) {
  const Icon = tile.icon;
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors duration-(--duration-fast)",
          active ? "bg-[#18181c]" : "hover:bg-[#141417]",
        )}
      >
        <span
          aria-hidden
          className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-lg text-[0.6875rem] font-bold", tile.className)}
        >
          {Icon ? <Icon className="size-4" strokeWidth={1.75} /> : tile.text}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium">{title}</span>
          {subtitle && <span className="block truncate text-xs text-foreground-subtle">{subtitle}</span>}
        </span>
        {count !== undefined && count > 0 && (
          <span className="tabular font-mono text-xs text-foreground-subtle">{count}</span>
        )}
      </Link>
    </li>
  );
}

function Group({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="flex items-baseline justify-between px-2.5 pt-2 pb-1.5">
        <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-foreground-subtle uppercase">{title}</p>
        {action}
      </div>
      <ul>{children}</ul>
    </div>
  );
}

const TILE = {
  teal: "bg-teal-tile text-teal-ink",
  plum: "bg-plum-tile text-plum-ink",
  amber: "bg-amber-tile text-amber-ink",
  neutral: "bg-[#26262b] text-[#d4d4d8]",
  area: "bg-[#1f2937] text-[#93c5fd]",
  done: "bg-[#0c2a1e] text-success",
};

/** Painel "Organização": atalhos principais, projetos ativos e áreas, com abas. */
export function SidebarNav({
  projects,
  areas,
  inboxCount,
  todoCount,
}: {
  projects: SidebarProject[];
  areas: SidebarArea[];
  inboxCount: number;
  todoCount: number;
}) {
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("tudo");
  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "tudo", label: "Tudo", count: projects.length + areas.length },
    { id: "projetos", label: "Projetos", count: projects.length },
    { id: "areas", label: "Áreas", count: areas.length },
  ];

  const projectList = (
    <Group
      title="Projetos"
      action={
        <Link href="/projetos" className="text-xs text-foreground-subtle hover:text-foreground">
          Ver todos
        </Link>
      }
    >
      {projects.length === 0 && <li className="px-2.5 py-2 text-xs text-foreground-subtle">Nenhum projeto ativo.</li>}
      {projects.map((p) => (
        <Item
          key={p.id}
          href={`/projetos/${p.id}`}
          title={p.name}
          subtitle={p.areaName ? `Projeto · ${p.areaName}` : "Projeto · sem área"}
          count={p.open}
          active={pathname === `/projetos/${p.id}`}
          tile={{ className: TILE.plum, text: p.monogram }}
        />
      ))}
    </Group>
  );

  const areaList = (
    <Group
      title="Áreas"
      action={
        <Link href="/areas" className="text-xs text-foreground-subtle hover:text-foreground">
          Editar
        </Link>
      }
    >
      {areas.length === 0 && <li className="px-2.5 py-2 text-xs text-foreground-subtle">Nenhuma área ainda.</li>}
      {areas.map((a) => (
        <Item
          key={a.id}
          href={`/agora?area=${a.id}`}
          title={a.name}
          subtitle="Área · ver na Agora"
          active={false}
          tile={{ className: TILE.area, icon: Layers }}
        />
      ))}
    </Group>
  );

  return (
    <nav aria-label="Organização" className="panel flex min-h-0 flex-col overflow-hidden">
      <div className="px-3.5 pt-3.5 pb-2.5">
        <h2 className="text-base font-semibold">Organização</h2>
      </div>
      <div role="group" aria-label="Mostrar" className="flex gap-1.5 border-b border-border px-3 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.8125rem] transition-colors duration-(--duration-fast)",
              tab === t.id ? "bg-[#2a2a2f] text-foreground" : "text-foreground-secondary hover:text-foreground",
            )}
          >
            {t.label}
            <span className="rounded bg-white/8 px-1.5 font-mono text-[0.625rem] font-semibold text-foreground-secondary">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2 [scrollbar-width:thin]">
        {tab === "tudo" && (
          <>
            <ul>
              <Item href="/agora" title="Agora" subtitle="O que merece atenção" active={is("/agora") || is("/sessao")} tile={{ className: TILE.teal, icon: CircleDot }} />
              <Item
                href="/a-fazer"
                title="A fazer"
                subtitle="Tudo que está para fazer"
                count={todoCount}
                active={is("/a-fazer")}
                tile={{ className: TILE.neutral, icon: ListTodo }}
              />
              <Item href="/agenda" title="Agenda" subtitle="Tarefas com prazo" active={is("/agenda")} tile={{ className: TILE.amber, icon: CalendarDays }} />
              <Item href="/feitas" title="Feitas" subtitle="O que já foi concluído" active={is("/feitas")} tile={{ className: TILE.done, icon: CircleCheck }} />
              {(inboxCount > 0 || is("/inbox")) && (
                <Item
                  href="/inbox"
                  title="Inbox"
                  subtitle={`${inboxCount} para organizar`}
                  count={inboxCount}
                  active={is("/inbox")}
                  tile={{ className: TILE.neutral, icon: Inbox }}
                />
              )}
            </ul>
            {projectList}
            {areaList}
          </>
        )}
        {tab === "projetos" && projectList}
        {tab === "areas" && areaList}
      </div>
    </nav>
  );
}
