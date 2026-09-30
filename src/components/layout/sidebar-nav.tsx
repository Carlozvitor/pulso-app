"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Briefcase,
  CalendarDays,
  CircleCheck,
  CircleDot,
  CornerDownRight,
  Inbox,
  ListTodo,
  Rocket,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Area } from "@/types/project";
import { cn } from "@/lib/utils";

export type SidebarProject = { id: string; name: string; monogram: string; open: number };

/** Árvore do Trabalho para a barra lateral, com as abertas de cada item (subitens inclusos). */
export type SidebarModule = { areas: Area[]; open: Record<string, number> };

type ItemProps = {
  href: string;
  title: string;
  subtitle: string;
  active: boolean;
  tile: { className: string; icon: LucideIcon };
};

/** Item principal: selo colorido, nome e uma linha de apoio. */
function Item({ href, title, subtitle, active, tile: { className, icon: Icon } }: ItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors duration-(--duration-fast)",
        active ? "bg-[#1b1c24] shadow-[inset_0_0_0_1px_#2b2d40]" : "hover:bg-[#141417]",
      )}
    >
      <span aria-hidden className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-lg", className)}>
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.84375rem] font-medium">{title}</span>
        <span className="block truncate text-xs text-foreground-subtle">{subtitle}</span>
      </span>
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

/** Trabalho: frentes sempre visíveis; a frente onde você está abre até o item atual. */
function WorkTree({ work, pathname }: { work: SidebarModule; pathname: string }) {
  const root = work.areas.find((a) => a.parentId === null);
  if (!root) return null;
  const currentId = pathname.startsWith("/trabalho/") ? pathname.split("/")[2] : null;
  // Do item atual até o topo: esses ficam abertos.
  const openIds = new Set<string>();
  for (let id = currentId; id; id = work.areas.find((a) => a.id === id)?.parentId ?? null) openIds.add(id);

  const branch = (parentId: string, label: string): React.ReactNode => {
    const children = work.areas.filter((a) => a.parentId === parentId).sort(byPosition);
    if (children.length === 0) return null;
    return (
      <Kids label={label}>
        {children.map((area) => (
          <li key={area.id}>
            <KidLink
              href={`/trabalho/${area.id}`}
              label={area.name}
              icon={CornerDownRight}
              count={work.open[area.id]}
              active={area.id === currentId}
            />
            {openIds.has(area.id) && branch(area.id, area.name)}
          </li>
        ))}
      </Kids>
    );
  };

  return (
    <>
      <Item
        href="/trabalho"
        title="Trabalho"
        subtitle={openLabel(work.open[root.id] ?? 0)}
        active={pathname === "/trabalho"}
        tile={{ className: "bg-blue-tile text-blue-ink", icon: Briefcase }}
      />
      {branch(root.id, "Trabalho")}
    </>
  );
}

function projectsLabel(count: number): string {
  if (count === 0) return "Nenhum em andamento";
  return count === 1 ? "1 em andamento" : `${count} em andamento`;
}

/**
 * Navegação do Hub no PC: Central e PULSO no topo, os módulos da vida embaixo
 * (só os que já existem) e Configurações no rodapé.
 */
export function SidebarNav({
  projects,
  work,
  inboxCount,
  todoCount,
}: {
  projects: SidebarProject[];
  work: SidebarModule;
  inboxCount: number;
  todoCount: number;
}) {
  const pathname = usePathname();
  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Hub" className="panel flex min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2.5 [scrollbar-width:thin]">
        <Item
          href="/central"
          title="Central"
          subtitle="O que merece atenção"
          active={is("/central")}
          tile={{ className: "bg-[#262a5c] text-[#a5acff]", icon: Zap }}
        />

        <div className="mt-1">
          <Item href="/agora" title="PULSO" subtitle="O que fazer" active={false} tile={{ className: "bg-teal-tile text-teal-ink", icon: Activity }} />
          <Kids label="PULSO">
            <Kid href="/agora" label="Agora" icon={CircleDot} active={is("/agora") || is("/sessao")} />
            <Kid href="/a-fazer" label="A fazer" icon={ListTodo} count={todoCount} active={is("/a-fazer")} />
            <Kid href="/agenda" label="Agenda" icon={CalendarDays} active={is("/agenda")} />
            <Kid href="/feitas" label="Feitas" icon={CircleCheck} active={is("/feitas")} />
            {(inboxCount > 0 || is("/inbox")) && <Kid href="/inbox" label="Inbox" icon={Inbox} count={inboxCount} active={is("/inbox")} />}
          </Kids>
        </div>

        <p className="flex items-center gap-2.5 px-2.5 pt-4 pb-2 text-[0.6875rem] font-semibold tracking-[0.1em] text-foreground-subtle uppercase after:h-px after:flex-1 after:bg-border">
          Minha vida
        </p>

        <WorkTree work={work} pathname={pathname} />

        <div className="mt-1">
          <Item
            href="/projetos"
            title="Projetos"
            subtitle={projectsLabel(projects.length)}
            active={pathname === "/projetos"}
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
  );
}
