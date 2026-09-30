import Link from "next/link";
import { ArrowUpRight, Briefcase } from "lucide-react";
import { CardFoot, CardTile } from "@/components/cards/card-parts";
import type { ModuleCardData } from "@/lib/central/queries";

function openLabel(n: number): string {
  if (n === 0) return "Nada aberto";
  return n === 1 ? "1 ação" : `${n} ações`;
}

/** Card de um módulo em "Minha vida": quantas ações abertas e a próxima. */
export function ModuleCard({ module }: { module: ModuleCardData }) {
  return (
    <Link
      href={module.href}
      className="tint tint-blue group flex min-h-40 flex-col p-4 transition-[filter] duration-(--duration-fast) hover:brightness-115 lg:min-h-52 lg:p-5 lg:px-6"
    >
      <span className="flex items-start justify-between">
        <CardTile icon={Briefcase} />
        <ArrowUpRight
          aria-hidden
          className="size-5 text-blue-ink opacity-60 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </span>
      <span className="mt-5 block truncate text-sm text-white/80">{module.label}</span>
      <span className="text-[1.5rem] leading-tight font-bold tracking-tight lg:text-[1.75rem]">{openLabel(module.open)}</span>
      <CardFoot left={module.next ? `Próxima: ${module.next.title}` : "Nada pedindo atenção"} stack />
    </Link>
  );
}
