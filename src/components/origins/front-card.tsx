import Link from "next/link";
import { ArrowUpRight, CornerDownRight } from "lucide-react";
import { CardTile } from "@/components/cards/card-parts";
import type { FrontSummary } from "@/lib/origins/summary";
import { originHref } from "@/lib/origins/tree";
import { projectMonogram } from "@/lib/projects/organize";
import { dueLabel } from "@/lib/dates";

function subsLabel(n: number): string {
  if (n === 0) return "sem subitens";
  return n === 1 ? "1 subitem" : `${n} subitens`;
}

function openLabel(n: number): string {
  if (n === 0) return "nada aberto";
  return n === 1 ? "1 ação aberta" : `${n} ações abertas`;
}

/** Card azul de uma frente do Trabalho: subitens com as abertas e a próxima ação. */
export function FrontCard({ front, today }: { front: FrontSummary; today: string }) {
  const href = originHref(front.node) ?? "#";
  const next = front.next;
  return (
    <article aria-labelledby={`frente-${front.node.id}`} className="tint tint-blue flex flex-col p-4 lg:p-5 lg:px-6">
      <Link href={href} className="group flex items-center gap-3.5">
        <CardTile>{projectMonogram(front.node.name)}</CardTile>
        <span className="min-w-0 flex-1">
          <span id={`frente-${front.node.id}`} className="block truncate text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.375rem]">
            {front.node.name}
          </span>
          <span className="block truncate text-caption text-white/60">
            {subsLabel(front.subs.length)} · {openLabel(front.open)}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-5 shrink-0 text-blue-ink opacity-60 transition-opacity duration-(--duration-fast) group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </Link>

      {front.subs.length > 0 && (
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {front.subs.map((sub) => (
            <li key={sub.node.id}>
              <Link
                href={originHref(sub.node) ?? "#"}
                className="flex min-h-11 items-center gap-2.5 rounded-lg bg-black/22 px-3 py-2 text-sm transition-colors duration-(--duration-fast) hover:bg-black/35"
              >
                <CornerDownRight aria-hidden className="size-3.5 shrink-0 text-blue-ink/80" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{sub.node.name}</span>
                <span className="tabular font-mono text-xs font-semibold text-white/55">{sub.open > 0 ? sub.open : "–"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-caption text-white/55">
          <span className="shrink-0">Próxima ação</span>
          {next ? (
            <Link href={`/tarefas/${next.id}`} className="truncate font-medium text-white/85 hover:text-white">
              {next.title}
              {next.dueDate && ` · ${dueLabel(next.dueDate, today).toLowerCase()}`}
            </Link>
          ) : (
            <span className="truncate">nada por agora</span>
          )}
        </div>
      </div>
    </article>
  );
}
