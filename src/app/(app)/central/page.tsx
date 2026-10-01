import Link from "next/link";
import { Briefcase, CalendarClock, CalendarDays, Eye, GraduationCap, Leaf, Sun, Wallet, Zap } from "lucide-react";
import { NowCard } from "@/components/agora/now-card";
import { TaskCard } from "@/components/agora/task-card";
import { CardTile, SectionHeading } from "@/components/cards/card-parts";
import { AttentionCard } from "@/components/central/attention-card";
import { CentralCapture } from "@/components/central/central-capture";
import { ModuleCard } from "@/components/central/module-card";
import { Money } from "@/components/dinheiro/money";
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

function eventsLabel(count: number): string | null {
  if (count === 0) return null;
  return count === 1 ? "1 compromisso" : `${count} compromissos`;
}

function openActions(n: number): string {
  if (n === 0) return "Nada aberto";
  return n === 1 ? "1 ação" : `${n} ações`;
}

/** Central: a porta de entrada do Hub — o que fazer agora, o que vence hoje e o que vem aí. */
export default async function CentralPage() {
  const [{ view, modules, agenda, projects }, session] = await Promise.all([getCentralPage(), getActiveSession()]);
  const { todayList, upcoming, todayEvents } = view;

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
          subtitle={[datePill(view.today), eventsLabel(todayEvents.length), deadlines(todayList.items.length, todayList.more)]
            .filter(Boolean)
            .join(" · ")}
          list={todayList}
          events={todayEvents}
          today={view.today}
          empty="Nada marcado nem com prazo para hoje."
        />
        <AttentionCard
          id="central-proximas"
          tone="neutral"
          icon={Eye}
          title="Próximas atenções"
          subtitle="Ainda não é hora, mas vem aí"
          list={upcoming}
          today={view.today}
          empty={`Nada marcado nem com prazo nos próximos ${UPCOMING_DAYS} dias.`}
        />
      </div>

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
          {modules.map((module) =>
            module.leftCents !== undefined ? (
              // Dinheiro: a sobra do mês e o que vence.
              <ModuleCard
                key={module.key}
                href={module.href}
                label="Dinheiro · sobra no mês"
                value={<Money cents={Math.abs(module.leftCents)} sign={module.leftCents < 0 ? "−" : undefined} />}
                foot={module.attention ?? "Nada vencendo"}
                icon={Wallet}
                tone="green"
              />
            ) : (
              <ModuleCard
                key={module.key}
                href={module.href}
                label={module.label}
                value={openActions(module.open)}
                // Na Faculdade, a prova/entrega que vem aí vale mais que a próxima tarefa.
                foot={module.attention ?? (module.next ? `Próxima: ${module.next.title}` : "Nada pedindo atenção")}
                icon={module.key === "FACULDADE" ? GraduationCap : module.key === "DINHEIRO" ? Wallet : Briefcase}
                tone={module.key === "FACULDADE" ? "rose" : module.key === "DINHEIRO" ? "green" : "blue"}
              />
            ),
          )}
          <ModuleCard
            href="/compromissos"
            label="Compromissos"
            value={agenda.count === 0 ? "Nada hoje" : `${agenda.count} hoje`}
            foot={agenda.next ? `Próximo: ${agenda.next.time ?? "dia todo"} · ${agenda.next.title}` : "Nada mais marcado hoje"}
            icon={CalendarClock}
            tone="amber"
          />
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} today={view.today} compact />
          ))}
        </div>
      </section>
    </Page>
  );
}
