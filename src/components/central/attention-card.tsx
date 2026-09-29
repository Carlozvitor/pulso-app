import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CardTile } from "@/components/cards/card-parts";
import type { AttentionItem, AttentionList } from "@/lib/central/central";
import { dueLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

function when(date: string, today: string): string {
  const label = dueLabel(date, today);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function origin(item: AttentionItem): string | null {
  if (item.kind === "task") return item.context;
  return `Prazo do projeto · ${item.progress.done} de ${item.progress.total} feitas`;
}

/**
 * Card da Central com uma lista de prazos (Hoje ou Próximas atenções).
 * Cada linha abre a tarefa ou o projeto; o que passou do limite vira "e mais N".
 */
export function AttentionCard({
  id,
  tone,
  icon,
  title,
  subtitle,
  list,
  today,
  empty,
}: {
  id: string;
  tone: "amber" | "neutral";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  list: AttentionList;
  today: string;
  empty: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("tint flex flex-col p-4 lg:p-5 lg:px-6", tone === "amber" ? "tint-amber" : "tint-neutral")}>
      <div className="flex items-center gap-3.5">
        <CardTile icon={icon} />
        <div className="min-w-0">
          <h2 id={id} className="text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.375rem]">
            {title}
          </h2>
          <p className="truncate text-caption text-white/60">{subtitle}</p>
        </div>
      </div>

      {list.items.length === 0 ? (
        <p className="mt-4 rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-0.5">
          {list.items.map((item) => {
            const sub = origin(item);
            return (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={item.kind === "task" ? `/tarefas/${item.id}` : `/projetos/${item.id}`}
                  className="flex min-h-12 items-center gap-3 rounded-lg bg-black/20 px-3 py-2 transition-colors duration-(--duration-fast) hover:bg-black/35"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    {sub && (
                      <span className={cn("block truncate text-caption", item.kind === "project" ? "text-plum-ink" : "text-white/50")}>
                        {sub}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "tabular shrink-0 text-caption font-semibold",
                      tone === "amber" ? "text-amber-ink" : "text-white/60",
                    )}
                  >
                    {when(item.date, today)}
                  </span>
                </Link>
              </li>
            );
          })}
          {list.more > 0 && (
            <li>
              <Link href="/agenda" className="block px-3 pt-2 text-caption text-white/55 transition-colors duration-(--duration-fast) hover:text-white">
                e mais {list.more} na Agenda
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
