import Link from "next/link";
import { ClipboardList, Play } from "lucide-react";
import { exercisesLabel } from "@/lib/treino/format";
import type { PlanCard } from "@/lib/treino/pages";
import { NewPlanButton } from "./plan-manage";
import { StartIconButton } from "./start-buttons";

/** Iniciais da ficha no selo: "Treino A" → "A"; outro nome → as duas primeiras letras. */
function planMark(name: string): string {
  const letter = name.match(/^treino\s+(\S{1,2})$/i);
  if (letter) return letter[1].toUpperCase();
  return name.replace(/\s+/g, "").slice(0, 2).toUpperCase();
}

/** Fichas (opcionais): a da vez marcada; sem nenhuma, explica como nasce uma. */
export function PlanList({ plans, suggestedName }: { plans: PlanCard[]; suggestedName: string }) {
  if (plans.length === 0) {
    return (
      <div className="grid gap-2 rounded-(--radius) border border-dashed border-border-strong p-4 lg:p-5">
        <p className="flex items-center gap-2.5 font-medium">
          <ClipboardList aria-hidden className="size-[1.0625rem] text-lime-ink" strokeWidth={1.75} />
          Nenhuma ficha ainda
        </p>
        <p className="text-sm text-foreground-secondary">
          Abra um treino que você fez e toque em <span className="font-semibold text-foreground">Salvar como ficha</span>. Com fichas, o Treino mostra qual
          é a da vez, na ordem A → B → C.
        </p>
        <div>
          <NewPlanButton suggestedName={suggestedName} variant="link" />
        </div>
      </div>
    );
  }

  return (
    <div className="tint tint-neutral p-2 lg:p-2.5">
      <ul className="grid gap-0.5">
        {plans.map(({ plan, names, count, next }) => (
          <li key={plan.id} className="flex items-center gap-1 rounded-lg transition-colors duration-(--duration-fast) hover:bg-white/4">
            <Link href={`/treino/fichas/${plan.id}`} className="flex min-h-15 min-w-0 flex-1 items-center gap-3 px-2 py-2">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-lime-tile text-sm font-bold text-lime-ink">
                {planMark(plan.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{plan.name}</span>
                  {next && <span className="shrink-0 rounded-[5px] bg-lime-ink/12 px-1.5 py-px text-[0.6875rem] font-semibold text-lime-ink">da vez</span>}
                </span>
                <span className="block truncate text-caption text-foreground-subtle">{count > 0 ? `${names} · ${exercisesLabel(count)}` : "Sem exercícios ainda"}</span>
              </span>
            </Link>
            {count > 0 && <StartIconButton planId={plan.id} label={`Começar ${plan.name}`} icon={Play} />}
          </li>
        ))}
      </ul>
      <div className="px-2 pt-1">
        <NewPlanButton suggestedName={suggestedName} variant="link" />
      </div>
    </div>
  );
}
