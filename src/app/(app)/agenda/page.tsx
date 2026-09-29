import { CalendarDays } from "lucide-react";
import { AgendaDay } from "@/components/agenda/day-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Page, Pill } from "@/components/layout/page";
import { datePill, todayIn } from "@/lib/dates";
import { listAgenda } from "@/lib/tasks/queries";

export const metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const days = await listAgenda();

  return (
    <Page
      wide
      icon={CalendarDays}
      title="Agenda"
      description="Tarefas com prazo, dia a dia."
      actions={<Pill icon={CalendarDays}>{datePill(todayIn())}</Pill>}
    >
      {days.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum prazo por perto."
          description="Quando uma tarefa ganhar data, ela aparece aqui, no dia dela."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
          {days.map((day) => (
            <AgendaDay key={day.key} id={`dia-${day.key}`} label={day.label} tasks={day.tasks} />
          ))}
        </div>
      )}
    </Page>
  );
}
