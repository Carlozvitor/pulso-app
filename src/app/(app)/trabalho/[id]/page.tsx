import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { Page } from "@/components/layout/page";
import { OriginActions } from "@/components/origins/origin-actions";
import { OriginContext } from "@/components/origins/origin-context";
import { OriginChildren, OriginManage } from "@/components/origins/origin-manage";
import { WORK_ICON_CLASS } from "@/components/origins/styles";
import { pastDayTitle, todayIn } from "@/lib/dates";
import { getOriginPage } from "@/lib/origins/queries";
import { MODULES, originHref } from "@/lib/origins/tree";

export const metadata = { title: "Trabalho" };

function openLabel(n: number): string {
  if (n === 0) return "nada aberto";
  return n === 1 ? "1 ação aberta" : `${n} ações abertas`;
}

function doneLabel(n: number): string {
  return n === 1 ? "1 feita nos últimos 7 dias" : `${n} feitas nos últimos 7 dias`;
}

/** Um item do Trabalho (Valentine, Conteúdo…): contexto à esquerda, ações do PULSO à direita. */
export default async function TrabalhoItemPage({ params }: PageProps<"/trabalho/[id]">) {
  const { id } = await params;
  const page = await getOriginPage(id);
  if (!page || page.node.module !== "TRABALHO") notFound();
  if (page.node.parentId === null) redirect("/trabalho");

  const { node, path, children, actions, today } = page;
  const parent = path[path.length - 2];
  const crumbs = path.map((area, i) => ({
    label: area.parentId === null ? MODULES[area.module].label : area.name,
    href: i < path.length - 1 ? (originHref(area) ?? undefined) : undefined,
  }));
  const updated = page.notesUpdatedAt ? `Atualizado ${pastDayTitle(todayIn(new Date(page.notesUpdatedAt)), today).toLowerCase()}` : null;

  return (
    <Page
      wide
      icon={FolderOpen}
      iconClassName={WORK_ICON_CLASS}
      title={node.name}
      description={`${parent.parentId === null ? MODULES[parent.module].label : parent.name} · ${openLabel(actions.length)}`}
      crumbs={crumbs}
      actions={
        <OriginManage
          node={node}
          parentHref={originHref(parent) ?? "/trabalho"}
          movable={page.movable}
          canMove={page.canMove}
          canDelete={page.canDelete}
        />
      }
    >
      <OriginChildren
        parent={node}
        items={children.map((c) => ({ id: c.node.id, name: c.node.name, open: c.open, href: originHref(c.node) }))}
      />

      <div className="mt-7 grid items-start gap-7 lg:mt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
        <section aria-labelledby="item-contexto">
          <SectionHeading id="item-contexto" title="Contexto" action={<span className="text-caption text-foreground-subtle">salva sozinho</span>} />
          <OriginContext id={node.id} notes={page.notes} updatedLabel={updated} links={page.links} />
        </section>

        <section aria-labelledby="item-acoes">
          <SectionHeading id="item-acoes" title="Ações no PULSO" action={<span className="text-caption text-foreground-subtle">por prioridade</span>} />
          <div className="tint tint-neutral p-3 lg:p-4">
            <OriginActions
              tasks={actions}
              today={today}
              addTo={{ id: node.id, name: node.name }}
              empty={`Nenhuma ação aberta em ${node.name}.`}
            />
            {page.doneLastWeek > 0 && (
              <Link href="/feitas" className="block px-1 pt-3 text-caption text-white/55 hover:text-white">
                {doneLabel(page.doneLastWeek)}
              </Link>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
