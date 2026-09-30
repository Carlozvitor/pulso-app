import Link from "next/link";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Filtro da Agora por módulo (inclui tudo abaixo dele). Vai na URL (?area=) — dá para voltar
 * e compartilhar o estado. Chega um item mais fundo (ex.: "Ver na Agora" de Valentine)? Ele vira um chip também.
 */
export function AreaFilter({ options: areas, selected }: { options: { id: string; name: string }[]; selected: string | null }) {
  if (areas.length === 0) return null;
  const options = [{ id: null, name: "Tudo" }, ...areas];
  return (
    <nav aria-label="Filtrar por módulo" className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-foreground-secondary">
        <Filter aria-hidden className="size-4" strokeWidth={1.75} />
        Filtro:
      </span>
      {options.map((option) => {
        const active = option.id === selected;
        return (
          <Link
            key={option.id ?? "tudo"}
            href={option.id ? `/agora?area=${option.id}` : "/agora"}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-(--duration-fast)",
              active
                ? "border-[#3b3e55] bg-[#1a1b24] text-[#b9bdd6]"
                : "border-[#707077] bg-[#5b5b61] text-[#f0f0f2] hover:bg-[#66666d]",
            )}
          >
            {option.name}
          </Link>
        );
      })}
    </nav>
  );
}
