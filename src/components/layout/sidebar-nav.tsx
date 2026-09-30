"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Briefcase,
  CalendarClock,
  CircleCheck,
  CircleDot,
  CornerDownRight,
  CreditCard,
  GraduationCap,
  Inbox,
  ListTodo,
  Rocket,
  Settings,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Area } from "@/types/project";
import { cn } from "@/lib/utils";
import { SIDEBAR_ID } from "./sidebar-state";
import { useSidebar } from "./sidebar-shell";

/** Recolhida: só os selos, com o nome como dica; subitens somem. */
const CompactContext = createContext(false);

export type SidebarProject = { id: string; name: string; monogram: string; open: number };

/** Compromissos de hoje: quantos e o próximo que ainda não passou. */
export type SidebarAgenda = { count: number; next: { time: string | null; title: string } | null };

function agendaLabel({ count, next }: SidebarAgenda): string {
  if (count === 0) return "Nada marcado hoje";
  const today = count === 1 ? "1 hoje" : `${count} hoje`;
  return next?.time ? `${today} · próximo ${next.time}` : today;
}

/**
 * Árvore de um módulo para a barra lateral, com as abertas de cada item (subitens inclusos).
 * `attention`: a próxima coisa do módulo que não é tarefa (Faculdade: "Prova amanhã · 19:00").
 */
export type SidebarModule = { areas: Area[]; open: Record<string, number>; attention?: string | null };

/** Dinheiro: a frase do que vence ("2 vencem hoje") e os cartões, que ficam embaixo dele. */
export type SidebarMoney = { cards: { id: string; name: string }[]; attention: string };

type ItemProps = {
  href: string;
  title: string;
  subtitle: string;
  active: boolean;
  tile: { className: string; icon: LucideIcon };
};

/** Item principal: selo colorido, nome e uma linha de apoio. */
function Item({ href, title, subtitle, active, tile: { className, icon: Icon } }: ItemProps) {
  const compact = useContext(CompactContext);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? title : undefined}
      title={compact ? `${title} · ${subtitle}` : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg py-2 transition-colors duration-(--duration-fast)",
        compact ? "justify-center px-0" : "px-2.5",
        active ? "bg-[#1b1c24] shadow-[inset_0_0_0_1px_#2b2d40]" : "hover:bg-[#141417]",
      )}
    >
      <span aria-hidden className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-lg", className)}>
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      {!compact && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.84375rem] font-medium">{title}</span>
          <span className="block truncate text-xs text-foreground-subtle">{subtitle}</span>
        </span>
      )}
    </Link>
  );
}

type KidProps = {
  href: string;
  label: string;
  active: boolean;
  icon?: LucideIcon;
  /** Iniciais do projeto no lugar do ícone. */
  monogram?: string;
  count?: number;
};

/** Subitem, pendurado no item de cima por uma linha. */
function Kid(props: KidProps) {
  return (
    <li>
      <KidLink {...props} />
    </li>
  );
}

function KidLink({ href, label, active, icon: Icon, monogram, count }: KidProps) {
  return (
    <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-(--duration-fast)",
          active ? "bg-[#1b1c24] text-foreground" : "text-foreground-secondary hover:bg-[#141417] hover:text-foreground",
        )}
      >
        {Icon ? (
          <Icon aria-hidden className={cn("size-3.5 shrink-0", active ? "text-primary-soft" : "text-foreground-subtle")} strokeWidth={1.75} />
        ) : (
          <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] bg-plum-tile text-[0.5625rem] font-bold text-plum-ink">
            {monogram}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && count > 0 && <span className="tabular font-mono text-[0.6875rem] text-foreground-subtle">{count}</span>}
      </Link>
  );
}

function Kids({ label, children }: { label: string; children: React.ReactNode }) {
  if (useContext(CompactContext)) return null;
  return (
    <ul aria-label={label} className="mt-0.5 mb-1.5 ml-[1.5625rem] grid gap-px border-l border-border pl-2.5">
      {children}
    </ul>
  );
}

function openLabel(count: number): string {
  if (count === 0) return "Nada aberto";
  return count === 1 ? "1 ação aberta" : `${count} ações abertas`;
}

const byPosition = (a: Area, b: Area) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR");

/**
 * Um módulo com árvore (Trabalho, Faculdade): o primeiro nível sempre visível; o item
 * onde você está abre até ele.
 */
function ModuleTree({
  nav,
  base,
  title,
  tile,
  pathname,
}: {
  nav: SidebarModule;
  base: string;
  title: string;
  tile: ItemProps["tile"];
  pathname: string;
}) {
  const compact = useContext(CompactContext);
  const root = nav.areas.find((a) => a.parentId === null);
  if (!root) return null;
  const currentId = pathname.startsWith(`${base}/`) ? pathname.split("/")[2] : null;
  // Do item atual até o topo: esses ficam abertos.
  const openIds = new Set<string>();
  for (let id = currentId; id; id = nav.areas.find((a) => a.id === id)?.parentId ?? null) openIds.add(id);

  const branch = (parentId: string, label: string): React.ReactNode => {
    const children = nav.areas.filter((a) => a.parentId === parentId).sort(byPosition);
    if (children.length === 0) return null;
    return (
      <Kids label={label}>
        {children.map((area) => (
          <li key={area.id}>
            <KidLink
              href={`${base}/${area.id}`}
              label={area.name}
              icon={CornerDownRight}
              count={nav.open[area.id]}
              active={area.id === currentId}
            />
            {openIds.has(area.id) && branch(area.id, area.name)}
          </li>
        ))}
      </Kids>
    );
  };

  return (
    <div className="mt-1 first:mt-0">
      <Item
        href={base}
        title={title}
        subtitle={nav.attention ?? openLabel(nav.open[root.id] ?? 0)}
        active={pathname === base || (compact && pathname.startsWith(`${base}/`))}
        tile={tile}
      />
      {branch(root.id, title)}
    </div>
  );
}

/** "4 em andamento · 1 pausado" — pausado só aparece na contagem. */
function projectsLabel(count: number, paused: number): string {
  const running = count === 0 ? "Nenhum em andamento" : count === 1 ? "1 em andamento" : `${count} em andamento`;
  if (paused === 0) return running;
  return `${running} · ${paused === 1 ? "1 pausado" : `${paused} pausados`}`;
}

/**
 * Navegação do Hub no PC: Central e PULSO no topo, os módulos da vida embaixo
 * (só os que já existem) e Configurações no rodapé.
 */
export function SidebarNav({
  projects,
  pausedProjects,
  work,
  school,
  money,
  agenda,
  inboxCount,
  todoCount,
}: {
  projects: SidebarProject[];
  pausedProjects: number;
  work: SidebarModule;
  school: SidebarModule | null;
  money: SidebarMoney | null;
  agenda: SidebarAgenda;
  inboxCount: number;
  todoCount: number;
}) {
  const pathname = usePathname();
  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const { compact } = useSidebar();
  const pulsoActive = ["/agora", "/sessao", "/a-fazer", "/feitas", "/inbox"].some(is);

  return (
    <CompactContext.Provider value={compact}>
    <nav id={SIDEBAR_ID} aria-label="Hub" className="panel flex min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2.5 [scrollbar-width:thin]">
        <Item
          href="/central"
          title="Central"
          subtitle="O que merece atenção"
          active={is("/central")}
          tile={{ className: "bg-[#262a5c] text-[#a5acff]", icon: Zap }}
        />

        <div className="mt-1">
          <Item href="/agora" title="PULSO" subtitle="O que fazer" active={compact && pulsoActive} tile={{ className: "bg-teal-tile text-teal-ink", icon: Activity }} />
          <Kids label="PULSO">
            <Kid href="/agora" label="Agora" icon={CircleDot} active={is("/agora") || is("/sessao")} />
            <Kid href="/a-fazer" label="A fazer" icon={ListTodo} count={todoCount} active={is("/a-fazer")} />
            <Kid href="/feitas" label="Feitas" icon={CircleCheck} active={is("/feitas")} />
            {(inboxCount > 0 || is("/inbox")) && <Kid href="/inbox" label="Inbox" icon={Inbox} count={inboxCount} active={is("/inbox")} />}
          </Kids>
        </div>

        {compact ? (
          <hr className="mx-2 my-3 border-border" />
        ) : (
          <p className="flex items-center gap-2.5 px-2.5 pt-4 pb-2 text-[0.6875rem] font-semibold tracking-[0.1em] text-foreground-subtle uppercase after:h-px after:flex-1 after:bg-border">
            Minha vida
          </p>
        )}

        <ModuleTree nav={work} base="/trabalho" title="Trabalho" tile={{ className: "bg-blue-tile text-blue-ink", icon: Briefcase }} pathname={pathname} />
        {school && (
          <ModuleTree
            nav={school}
            base="/faculdade"
            title="Faculdade"
            tile={{ className: "bg-rose-tile text-rose-ink", icon: GraduationCap }}
            pathname={pathname}
          />
        )}

        {money && (
          <div className="mt-1">
            <Item
              href="/dinheiro"
              title="Dinheiro"
              subtitle={money.attention}
              active={pathname === "/dinheiro" || (compact && pathname.startsWith("/dinheiro/"))}
              tile={{ className: "bg-green-tile text-green-ink", icon: Wallet }}
            />
            {money.cards.length > 0 && (
              <Kids label="Cartões">
                {money.cards.map((card) => (
                  <Kid
                    key={card.id}
                    href={`/dinheiro/cartoes/${card.id}`}
                    label={card.name}
                    icon={CreditCard}
                    active={pathname === `/dinheiro/cartoes/${card.id}`}
                  />
                ))}
              </Kids>
            )}
          </div>
        )}

        <div className="mt-1">
          <Item
            href="/compromissos"
            title="Compromissos"
            subtitle={agendaLabel(agenda)}
            active={is("/compromissos")}
            tile={{ className: "bg-amber-tile text-amber-ink", icon: CalendarClock }}
          />
        </div>

        <div className="mt-1">
          <Item
            href="/projetos"
            title="Projetos"
            subtitle={projectsLabel(projects.length, pausedProjects)}
            active={pathname === "/projetos" || (compact && pathname.startsWith("/projetos/"))}
            tile={{ className: "bg-plum-tile text-plum-ink", icon: Rocket }}
          />
          {projects.length > 0 && (
            <Kids label="Projetos em andamento">
              {projects.map((p) => (
                <Kid key={p.id} href={`/projetos/${p.id}`} label={p.name} monogram={p.monogram} count={p.open} active={pathname === `/projetos/${p.id}`} />
              ))}
            </Kids>
          )}
        </div>
      </div>

      <div className="border-t border-border px-1.5 py-2">
        <Item
          href="/configuracoes"
          title="Configurações"
          subtitle="Origens, conta, sair"
          active={is("/configuracoes") || is("/origens")}
          tile={{ className: "bg-[#1d1d21] text-foreground-secondary", icon: Settings }}
        />
      </div>
    </nav>
    </CompactContext.Provider>
  );
}
