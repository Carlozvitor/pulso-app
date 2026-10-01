import { formatCents } from "@/lib/dinheiro/format";
import { cn } from "@/lib/utils";

/**
 * Um valor em reais. Com o olho fechado (Dinheiro ou Central), vira "R$ •••" — pelo CSS
 * (`[data-valores="ocultos"]` em globals.css), sem esperar o servidor.
 */
export function Money({
  cents,
  approximate,
  sign,
  className,
}: {
  cents: number;
  approximate?: boolean;
  /** "+" em entrada, "−" em gasto. */
  sign?: "+" | "−";
  className?: string;
}) {
  const text = `${sign ? `${sign} ` : ""}${approximate ? "≈ " : ""}${formatCents(cents)}`;
  return (
    <span className={cn("tabular whitespace-nowrap", className)}>
      <span className="money-v">{text}</span>
      <span className="money-h">R$ •••</span>
    </span>
  );
}
