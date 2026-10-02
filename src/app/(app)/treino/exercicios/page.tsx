import Link from "next/link";
import { Archive, ChevronRight, List } from "lucide-react";
import { Page } from "@/components/layout/page";
import { TRAINING_ICON_CLASS } from "@/components/origins/styles";
import { EvolutionList } from "@/components/treino/evolution-list";
import { NewExerciseButton } from "@/components/treino/exercise-manage";
import { KIND_LABEL } from "@/lib/treino/format";
import { getExercisesPage } from "@/lib/treino/pages";

export const metadata = { title: "Exercícios" };

/** Todos os exercícios: os feitos mais recentemente primeiro, os nunca feitos no fim e os guardados à parte. */
export default async function ExerciciosPage() {
  const { list, archived, today } = await getExercisesPage();
  const done = list.filter((s) => s.last).length;

  return (
    <Page
      wide
      icon={List}
      iconClassName={TRAINING_ICON_CLASS}
      title="Exercícios"
      description={list.length === 0 ? "Nenhum ainda" : `${list.length} na lista · ${done} com registro`}
      crumbs={[{ label: "Treino", href: "/treino" }, { label: "Exercícios" }]}
      actions={<NewExerciseButton />}
    >
      <div className="tint tint-lime p-2 lg:p-2.5">
        <EvolutionList items={list} today={today} empty="Nenhum exercício ainda. Eles entram aqui quando você registra um treino ou cria um novo." />
      </div>

      {archived.length > 0 && (
        <details className="group mt-4 rounded-xl border border-dashed border-border-strong">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-4 text-sm text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground [&::-webkit-details-marker]:hidden">
            <Archive aria-hidden className="size-4" strokeWidth={1.75} />
            <span className="flex-1">Guardados</span>
            <span className="tabular font-mono text-xs font-semibold">{archived.length}</span>
            <ChevronRight aria-hidden className="size-4 transition-transform duration-(--duration-fast) group-open:rotate-90" strokeWidth={1.75} />
          </summary>
          <ul className="grid gap-0.5 px-2 pb-2">
            {archived.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  href={`/treino/exercicios/${exercise.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2.5 text-sm text-foreground-secondary transition-colors duration-(--duration-fast) hover:bg-white/5 hover:text-foreground"
                >
                  <span className="truncate">{exercise.name}</span>
                  <span className="shrink-0 text-caption text-foreground-subtle">{KIND_LABEL[exercise.kind]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Page>
  );
}
