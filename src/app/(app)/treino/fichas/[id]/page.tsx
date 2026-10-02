import { notFound } from "next/navigation";
import { ClipboardList, Play } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { Page, Pill } from "@/components/layout/page";
import { TRAINING_ICON_CLASS } from "@/components/origins/styles";
import { PlanEditor } from "@/components/treino/plan-editor";
import { PlanMenu } from "@/components/treino/plan-manage";
import { StartButton } from "@/components/treino/start-buttons";
import { pastDayTitle } from "@/lib/dates";
import { exercisesLabel } from "@/lib/treino/format";
import { getPlanPage } from "@/lib/treino/pages";

export const metadata = { title: "Ficha" };

function usedLabel(used: number, lastUsed: string | null, today: string): string {
  if (used === 0 || !lastUsed) return "Ainda não usada";
  const times = used === 1 ? "Usada 1 vez" : `Usada ${used} vezes`;
  return `${times} · a última ${pastDayTitle(lastUsed, today).toLocaleLowerCase("pt-BR")}`;
}

/** Uma ficha: os exercícios em ordem e o botão de começar. Os números vêm sempre da última vez. */
export default async function FichaPage({ params }: PageProps<"/treino/fichas/[id]">) {
  const { id } = await params;
  const page = await getPlanPage(id);
  if (!page) notFound();
  const { plan, items, today } = page;

  return (
    <Page
      icon={ClipboardList}
      iconClassName={TRAINING_ICON_CLASS}
      title={plan.name}
      description={[exercisesLabel(items.length), usedLabel(page.used, page.lastUsed, today)].join(" · ")}
      crumbs={[{ label: "Treino", href: "/treino" }, { label: "Fichas" }, { label: plan.name }]}
      actions={
        <>
          {page.next && <Pill>É a da vez</Pill>}
          {items.length > 0 && (
            <StartButton input={{ from: "plan", planId: plan.id }} label={page.inProgress ? "Continuar treino" : "Começar treino"} variant="header" icon={Play} />
          )}
          <PlanMenu planId={plan.id} name={plan.name} />
        </>
      }
    >
      <section aria-labelledby="ficha-exercicios">
        <SectionHeading id="ficha-exercicios" title="Exercícios" action={<span className="text-caption text-foreground-subtle">na ordem em que você faz</span>} />
        <div className="tint tint-lime p-2 lg:p-2.5">
          <PlanEditor planId={plan.id} items={items} catalog={page.catalog} />
        </div>
        <p className="mt-3 text-caption text-foreground-subtle">
          Ao começar, cada exercício vem com os números da última vez. Com mais de uma ficha, o Treino segue a ordem em que elas foram criadas (A → B → C).
        </p>
      </section>
    </Page>
  );
}
