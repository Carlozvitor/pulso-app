import Link from "next/link";
import { ArrowRight, CircleCheck, Dumbbell, Play, Plus } from "lucide-react";
import type { Occurrence } from "@/types/event";
import { CardTile } from "@/components/cards/card-parts";
import { timeLabel } from "@/lib/dates";
import { exercisesLabel } from "@/lib/treino/format";
import type { PlanCard } from "@/lib/treino/pages";
import { dayLabel, type SessionSummary } from "@/lib/treino/summary";
import { AcademyChip, ScheduleAcademyButton } from "./academy";
import { RepeatButton, StartButton, type RepeatChoice } from "./start-buttons";

const linkButton =
  "grid min-h-16 min-w-0 content-start gap-1 rounded-[10px] px-4 py-3.5 text-left transition-[filter] duration-(--duration-fast) hover:brightness-110";

/**
 * "Treino de hoje": o que fazer agora no Treino. Em andamento → continuar; feito hoje →
 * ver ou registrar outro; senão, começar (pela ficha da vez, do zero ou repetindo um anterior).
 */
export function TodayCard({
  open,
  todayDone,
  last,
  nextPlan,
  repeatable,
  academy,
  hasSchedule,
  rootId,
  today,
}: {
  open: SessionSummary | null;
  todayDone: SessionSummary[];
  last: SessionSummary | null;
  nextPlan: PlanCard | null;
  repeatable: SessionSummary[];
  academy: Occurrence | null;
  hasSchedule: boolean;
  rootId: string;
  today: string;
}) {
  const choices: RepeatChoice[] = repeatable.map((s) => ({
    id: s.session.id,
    date: s.session.date,
    title: s.title,
    names: s.names,
    done: s.done,
  }));
  const done = todayDone[0];

  let title: string;
  let subtitle: string;
  let buttons: React.ReactNode;
  if (open) {
    title = "Treino em andamento";
    subtitle = [`começou ${timeLabel(new Date(open.session.startedAt))}`, `${open.done} de ${open.total} feitos`].join(" · ");
    buttons = (
      <Link href={`/treino/fazer/${open.session.id}`} className={`${linkButton} bg-lime-ink text-[#141a04] sm:col-span-2`}>
        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
          <Play aria-hidden className="size-[1.0625rem]" strokeWidth={2} />
          Continuar treino
        </span>
        <span className="truncate text-caption text-[#141a04]/70">{open.total === 0 ? "Ainda sem exercícios." : open.names || open.title}</span>
      </Link>
    );
  } else if (done) {
    title = "Treino de hoje feito";
    subtitle = [done.names || done.title, exercisesLabel(done.done)].join(" · ");
    buttons = (
      <>
        <Link href={`/treino/fazer/${done.session.id}`} className={`${linkButton} bg-black/30 shadow-[inset_0_0_0_1px_rgb(190_242_100/0.22)]`}>
          <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
            <CircleCheck aria-hidden className="size-[1.0625rem] text-lime-ink" strokeWidth={2} />
            Ver o treino
          </span>
          <span className="text-caption text-white/60">Dá para corrigir algum número.</span>
        </Link>
        <StartButton input={{ from: "empty" }} label="Registrar outro" hint="Mais um treino hoje (ex.: cardio à noite)." variant="alt" />
      </>
    );
  } else {
    title = "Treino de hoje";
    subtitle = last ? `Último: ${dayLabel(last.session.date, today)} · ${exercisesLabel(last.done)}` : "Nenhum treino registrado ainda.";
    buttons = nextPlan ? (
      <>
        <StartButton input={{ from: "plan", planId: nextPlan.plan.id }} label={`Começar ${nextPlan.plan.name}`} hint={nextPlan.names || "Ficha sem exercícios."} variant="main" icon={Play} />
        <StartButton input={{ from: "empty" }} label="Registrar treino" hint="Outro treino, escolhendo os exercícios." variant="alt" />
      </>
    ) : (
      <>
        <StartButton
          input={{ from: "empty" }}
          label="Registrar treino"
          hint="Escolha os exercícios. Cada um já vem com o que você fez da última vez."
          variant="main"
          icon={Plus}
        />
        {choices.length > 0 ? (
          <RepeatButton choices={choices} today={today} />
        ) : (
          <p className="grid content-center rounded-[10px] bg-black/20 px-4 py-3.5 text-caption text-white/55">
            Depois do primeiro, dá para repetir um treino com um toque.
          </p>
        )}
      </>
    );
  }

  const repeatLink = !open && !done && nextPlan && choices.length > 0;
  const scheduleLink = !hasSchedule;

  return (
    <div className="tint tint-lime flex flex-1 flex-col p-4 lg:p-5">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
        <CardTile icon={Dumbbell} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.25rem] leading-tight font-bold tracking-tight lg:text-[1.3125rem]">{title}</h3>
          <p className="text-caption text-white/62">{subtitle}</p>
        </div>
        {academy && <AcademyChip occurrence={academy} />}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">{buttons}</div>

      {(repeatLink || scheduleLink) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 pt-2">
          {repeatLink ? <RepeatButton choices={choices} today={today} variant="link" /> : <span />}
          {scheduleLink && <ScheduleAcademyButton rootId={rootId} today={today} />}
        </div>
      )}
      {!repeatLink && !scheduleLink && (
        <Link href="/treino/historico" className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-2 text-caption text-white/55 hover:text-white">
          Histórico de treinos
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.75} />
        </Link>
      )}
    </div>
  );
}
