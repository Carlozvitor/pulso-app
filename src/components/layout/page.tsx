import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BackButton } from "@/components/navigation/back-button";
import { cn } from "@/lib/utils";

type PageProps = {
  icon: LucideIcon;
  title: string;
  description?: string | null;
  /** Pílulas/botões à direita do título (data, sessão, "Novo projeto"…). */
  actions?: React.ReactNode;
  back?: boolean;
  /** Grades de cards usam a largura toda; listas e formulários ficam estreitos. */
  wide?: boolean;
  children: React.ReactNode;
};

/**
 * Moldura de toda tela: cabeçalho (selo + título + ações) e o conteúdo.
 * No PC fica dentro do painel principal; no celular ocupa a coluna.
 */
export function Page({ icon: Icon, title, description, actions, back, wide, children }: PageProps) {
  return (
    <>
      <header className="-mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-4 pt-3 pb-4 lg:mx-0 lg:px-6 lg:py-5">
        {back && (
          <div className="basis-full lg:basis-auto">
            <BackButton />
          </div>
        )}
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-foreground text-background lg:size-12"
        >
          <Icon className="size-5 lg:size-6" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-title font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-foreground-secondary">{description}</p>}
        </div>
        {actions && <div className="flex basis-full flex-wrap items-center gap-2 sm:basis-auto">{actions}</div>}
      </header>
      <div className={cn("pt-5 pb-8 lg:px-6 lg:pt-6 lg:pb-28", !wide && "lg:max-w-3xl")}>{children}</div>
    </>
  );
}

type PillProps = {
  icon?: LucideIcon;
  /** "live": verde, para algo em andamento (sessão, tarefa começada). */
  tone?: "default" | "live";
  href?: string;
  children: React.ReactNode;
};

/** Pílula do cabeçalho: data, "Sessão até 15:40", "Em andamento". */
export function Pill({ icon: Icon, tone = "default", href, children }: PillProps) {
  const className = cn(
    "tabular inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium lg:h-10 lg:px-3.5",
    tone === "live"
      ? "border-[#1c5b3f] bg-[#0c2a1e] text-[#6ee7b7]"
      : "border-border-strong bg-elevated text-foreground",
    href && "transition-colors duration-(--duration-fast) hover:brightness-125",
  );
  const content = (
    <>
      {tone === "live" && <span aria-hidden className="size-1.5 rounded-full bg-success" />}
      {Icon && <Icon aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />}
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

/** Lista dentro de um painel (Inbox, Áreas, busca…). Linhas com -mx-4 continuam alinhadas. */
export function ListPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("panel px-4", className)}>{children}</div>;
}
