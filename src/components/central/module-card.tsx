import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { CardFoot, CardTile } from "@/components/cards/card-parts";
import { cn } from "@/lib/utils";

/** Card de um módulo em "Minha vida": um número que ajuda a agir e a próxima coisa. */
export function ModuleCard({
  href,
  label,
  value,
  foot,
  icon,
  tone,
}: {
  href: string;
  label: string;
  /** "3 ações", "2 hoje", a sobra do mês… */
  value: React.ReactNode;
  foot: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "rose" | "green" | "lime";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "tint group flex min-h-40 flex-col p-4 transition-[filter] duration-(--duration-fast) hover:brightness-115 lg:min-h-52 lg:p-5 lg:px-6",
        `tint-${tone}`,
      )}
    >
      <span className="flex items-start justify-between">
        <CardTile icon={icon} />
        <ArrowUpRight
          aria-hidden
          className="size-5 text-(--tint-ink) opacity-60 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </span>
      <span className="mt-5 block truncate text-sm text-white/80">{label}</span>
      <span className="text-[1.5rem] leading-tight font-bold tracking-tight lg:text-[1.75rem]">{value}</span>
      <CardFoot left={foot} stack />
    </Link>
  );
}
