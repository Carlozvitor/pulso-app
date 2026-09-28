import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <>
      <PageHeader title="Agenda" />
      <EmptyState
        icon={CalendarDays}
        title="Nenhum prazo por perto."
        description="Tarefas com data aparecem aqui, em ordem."
      />
    </>
  );
}
