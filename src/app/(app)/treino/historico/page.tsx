import { History } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { Page } from "@/components/layout/page";
import { TRAINING_ICON_CLASS } from "@/components/origins/styles";
import { SessionRows } from "@/components/treino/session-rows";
import { getHistoryPage } from "@/lib/treino/pages";
import type { SessionSummary } from "@/lib/treino/summary";

export const metadata = { title: "Histórico de treinos" };

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Os treinos por mês, do mais novo ao mais velho. */
function byMonth(sessions: SessionSummary[]): { key: string; label: string; sessions: SessionSummary[]; days: number }[] {
  const groups = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const key = s.session.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups].map(([key, list]) => ({
    key,
    label: `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`,
    sessions: list,
    days: new Set(list.map((s) => s.session.date)).size,
  }));
}

/** Histórico: todos os treinos concluídos, agrupados por mês. */
export default async function HistoricoPage() {
  const { sessions, total, today } = await getHistoryPage();
  const months = byMonth(sessions);

  return (
    <Page
      icon={History}
      iconClassName={TRAINING_ICON_CLASS}
      title="Histórico de treinos"
      description={total === 0 ? "Nenhum treino ainda" : total === 1 ? "1 treino" : `${total} treinos`}
      crumbs={[{ label: "Treino", href: "/treino" }, { label: "Histórico" }]}
    >
      {months.length === 0 && <p className="panel px-4 py-5 text-sm text-foreground-secondary">Nenhum treino concluído ainda. Eles aparecem aqui por mês.</p>}
      <div className="grid gap-8">
        {months.map((month) => (
          <section key={month.key} aria-labelledby={`mes-${month.key}`}>
            <SectionHeading
              id={`mes-${month.key}`}
              title={month.label}
              action={<span className="text-caption text-foreground-subtle">{month.days === 1 ? "1 dia de treino" : `${month.days} dias de treino`}</span>}
            />
            <div className="tint tint-neutral p-1.5 lg:p-2">
              <SessionRows sessions={month.sessions} today={today} empty="" />
            </div>
          </section>
        ))}
      </div>
      {total > sessions.length && <p className="mt-4 text-caption text-foreground-subtle">Mostrando os {sessions.length} mais recentes.</p>}
    </Page>
  );
}
