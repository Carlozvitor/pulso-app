import Link from "next/link";
import { CalendarDays, Eye, Leaf, Sun, Zap } from "lucide-react";
import { NowCard } from "@/components/agora/now-card";
import { TaskCard } from "@/components/agora/task-card";
import { CardTile, SectionHeading } from "@/components/cards/card-parts";
import { AttentionCard } from "@/components/central/attention-card";
import { CentralCapture } from "@/components/central/central-capture";
import { Page, Pill } from "@/components/layout/page";
import { ProjectCard } from "@/components/projects/project-card";
import { getCentralPage } from "@/lib/central/queries";
import { UPCOMING_DAYS } from "@/lib/central/central";
import { datePill, timeLabel } from "@/lib/dates";
import { getActiveSession } from "@/lib/sessions/queries";

export const metadata = { title: "Central" };

const linkClass = "text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground";

function deadlines(count: number, more: number): string {
  const total = count + more;
  if (total === 0) return "nenhum prazo";
  return total === 1 ? "1 prazo" : `${total} prazos`;
}

/** Central: a porta de entrada do Hub — o que fazer agora, o que vence hoje e o que vem aí. */
export default async function CentralPage() {
  const [{ view, projects }, session] = await Promise.all([getCentralPage(), getActiveSession()]);
  const { todayList, upcoming } = view;

  return (
    <Page
      wide
      icon={Zap}
      title="Central"
      description="O que merece sua atenção agora"
      actions={
        <>
          <Pill icon={CalendarDays}>{datePill(view.today)}</Pill>
          {session ? (
            <Pill tone="live" href="/sessao">
              Sessão até {timeLabel(new Date(session.endsAt))}
            </Pill>
          ) : (
            view.now?.status === "IN_PROGRESS" && <Pill tone="live">Em andamento</Pill>
          )}
        </>
      }
    >
      <CentralCapture />

      <section aria-labelledby="central-agora" className="mt-8 lg:mt-9">
        <SectionHeading
          id="central-agora"
          title="Agora"
          action={
            <Link href="/agora" className={linkClass}>
              Abrir no PULSO
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
          {view.now ? (
            <>
              <NowCard task={view.now} today={view.today} />
              {view.next.map((task) => (
                <TaskCard key={task.id} task={task} today={view.today} tone="teal" note={task.paused ? "Pausada" : "Depois"} />
              ))}
            </>
          ) : (
            <div className="tint tint-teal flex flex-col p-5 sm:col-span-2 lg:p-6">
              <CardTile icon={Leaf} />
              <p className="mt-5 text-[1.375rem] leading-tight font-semibold tracking-tight">Nada pedindo sua atenção agora.</p>
              <p className="mt-1 max-w-md text-sm text-white/70">Quando lembrar de algo, anote aqui em cima — vai para o PULSO na hora.</p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-3 lg:mt-9 lg:grid-cols-2 lg:gap-5">
        <AttentionCard
          id="central-hoje"
          tone="amber"
          icon={Sun}
          title="Hoje"
          subtitle={`${datePill(view.today)} · ${deadlines(todayList.items.length, todayList.more)}`}
          list={todayList}
          today={view.today}
          empty="Nada com prazo para hoje."
        />
        <AttentionCard
          id="central-proximas"
          tone="neutral"
          icon={Eye}
          title="Próximas atenções"
          subtitle="Ainda não é hora, mas vem aí"
          list={upcoming}
          today={view.today}
          empty={`Nada com prazo nos próximos ${UPCOMING_DAYS} dias.`}
        />
      </div>

      {projects.length > 0 && (
        <section aria-labelledby="central-vida" className="mt-8 lg:mt-9">
          <SectionHeading
            id="central-vida"
            title="Minha vida"
            action={
              <Link href="/projetos" className={linkClass}>
                Todos os projetos
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} today={view.today} compact />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
