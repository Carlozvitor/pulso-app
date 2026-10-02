"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { toast } from "sonner";
import { addPlanItem, movePlanItem, removePlanItem } from "@/lib/actions/client";
import { KIND_LABEL } from "@/lib/treino/format";
import type { CatalogItem, PlanItemRow } from "@/lib/treino/pages";
import { cn } from "@/lib/utils";
import { ExerciseAdder } from "./exercise-adder";
import { kindTag } from "./styles";

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-lg text-white/45 transition-colors duration-(--duration-fast) hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-25";

/** Os exercícios da ficha, em ordem: subir, descer, tirar e adicionar. Os números vêm da última vez. */
export function PlanEditor({ planId, items, catalog }: { planId: string; items: PlanItemRow[]; catalog: CatalogItem[] }) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error ?? "Não deu para salvar agora. Tente de novo.");
    });
  }

  return (
    <div className="grid gap-2">
      {items.length > 0 ? (
        <ol className="grid gap-1">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-1 rounded-[9px] bg-black/25 py-1 pr-1 pl-3 lg:pl-3.5">
              <span className="tabular w-5 shrink-0 font-mono text-xs font-semibold text-white/40">{i + 1}</span>
              <Link href={`/treino/exercicios/${item.exercise.id}`} className="min-w-0 flex-1 py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[0.9375rem] font-medium">{item.exercise.name}</span>
                  <span className={cn(kindTag, "hidden sm:inline-flex")}>{KIND_LABEL[item.exercise.kind]}</span>
                </span>
                <span className="tabular block truncate text-caption text-white/50">{item.last ? `Última: ${item.last}` : "Ainda sem registro"}</span>
              </Link>
              <button
                type="button"
                aria-label={`Subir ${item.exercise.name}`}
                disabled={pending || i === 0}
                onClick={() => run(() => movePlanItem(item.id, -1))}
                className={iconButton}
              >
                <ArrowUp aria-hidden className="size-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label={`Descer ${item.exercise.name}`}
                disabled={pending || i === items.length - 1}
                onClick={() => run(() => movePlanItem(item.id, 1))}
                className={iconButton}
              >
                <ArrowDown aria-hidden className="size-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label={`Tirar ${item.exercise.name} da ficha`}
                disabled={pending}
                onClick={() => run(() => removePlanItem(item.id))}
                className={iconButton}
              >
                <X aria-hidden className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-2 pt-1 pb-0.5 text-sm text-white/65">Ficha vazia. Adicione os exercícios na ordem em que você faz.</p>
      )}
      <ExerciseAdder catalog={catalog} exclude={items.map((i) => i.exercise.id)} onAdd={(target) => addPlanItem(planId, target)} />
    </div>
  );
}
