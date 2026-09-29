import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Peças dos cards coloridos (.tint + .tint-teal/plum/amber/neutral, em globals.css).
 * A cor vem da família do card pai: selo e anel herdam --tint-tile / --tint-ink.
 */

/** Selo quadrado no canto do card: ícone ou iniciais. */
export function CardTile({ icon: Icon, children, className }: { icon?: LucideIcon; children?: React.ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "tint-tile flex size-11 shrink-0 items-center justify-center rounded-[9px] text-sm font-semibold tracking-wide lg:size-12",
        className,
      )}
    >
      {Icon ? <Icon className="size-5 lg:size-[1.375rem]" strokeWidth={1.75} /> : children}
    </span>
  );
}

/**
 * Linha de baixo do card: separador fino, texto à esquerda, valor à direita.
 * `stack`: em card estreito (celular e PC pequeno) o valor desce para a linha de baixo.
 */
export function CardFoot({
  left,
  right,
  highlight,
  stack,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  highlight?: boolean;
  stack?: boolean;
}) {
  return (
    <div className="mt-auto pt-4">
      <div
        className={cn(
          "flex justify-between gap-x-3 border-t border-white/10 pt-3 text-caption text-white/60",
          stack ? "flex-col gap-y-0.5 xl:flex-row xl:items-center" : "items-center",
        )}
      >
        <span className="truncate">{left}</span>
        {right && (
          <span className={cn("tabular shrink-0 font-semibold", highlight ? "text-success" : "text-white/80")}>
            {right}
          </span>
        )}
      </div>
    </div>
  );
}

const RADIUS = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anel de progresso (0–100). O conteúdo (ícone) fica no centro. */
export function ProgressRing({ percent, label, children }: { percent: number; label: string; children?: React.ReactNode }) {
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * CIRCUMFERENCE;
  return (
    <span role="img" aria-label={label} className="relative grid size-11 shrink-0 place-items-center text-success">
      <svg aria-hidden viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={RADIUS} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="3" />
        {dash > 0 && (
          <circle
            cx="22"
            cy="22"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          />
        )}
      </svg>
      {children}
    </span>
  );
}

/** Título de seção com link opcional à direita ("Todos os projetos"). */
export function SectionHeading({ id, title, action }: { id: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 px-0.5">
      <h2 id={id} className="text-caption font-semibold tracking-[0.1em] text-foreground-secondary uppercase">
        {title}
      </h2>
      {action}
    </div>
  );
}
