import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { Page } from "@/components/layout/page";
import { FrontCard } from "@/components/origins/front-card";
import { OriginActions } from "@/components/origins/origin-actions";
import { OriginChildren } from "@/components/origins/origin-manage";
import { WORK_ICON_CLASS } from "@/components/origins/styles";
import { getModulePage } from "@/lib/origins/queries";

export const metadata = { title: "Trabalho" };

const linkClass = "text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground";

/** Módulo Trabalho: as frentes (contexto) e as ações do PULSO que vêm delas. */
export default async function TrabalhoPage() {
  const page = await getModulePage("TRABALHO");
  if (!page) notFound();
  const { root, fronts, actions, open, today } = page;
  const hidden = open - actions.length;

  return (
    <Page
      wide
      icon={Briefcase}
      iconClassName={WORK_ICON_CLASS}
      title="Trabalho"
      description="Onde fica o contexto profissional. As ações ficam no PULSO."
    >
      <section aria-labelledby="trabalho-frentes">
        <SectionHeading id="trabalho-frentes" title="Frentes" />
        {fronts.length > 0 && (
          <div className="mb-4 grid gap-3 lg:grid-cols-2 lg:gap-5">
            {fronts.map((front) => (
              <FrontCard key={front.node.id} front={front} today={today} />
            ))}
          </div>
        )}
        <OriginChildren parent={root} items={[]} addLabel="Nova frente" />
      </section>

      <section aria-labelledby="trabalho-acoes" className="mt-8 lg:mt-9">
        <SectionHeading
          id="trabalho-acoes"
          title="Ações em Trabalho"
          action={
            <Link href={`/agora?area=${root.id}`} className={linkClass}>
              Ver na Agora
            </Link>
          }
        />
        <div className="tint tint-neutral p-3 lg:p-4">
          <OriginActions tasks={actions} today={today} empty="Nenhuma ação aberta no Trabalho agora." />
          {hidden > 0 && (
            <Link href={`/agora?area=${root.id}`} className="block px-3 pt-3 text-caption text-white/55 hover:text-white">
              e mais {hidden} na Agora
            </Link>
          )}
        </div>
      </section>
    </Page>
  );
}
