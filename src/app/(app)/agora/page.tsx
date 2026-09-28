import { Leaf } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { NowFocus } from "@/components/agora/now-focus";
import { TaskSection } from "@/components/agora/task-section";
import { PageHeader } from "@/components/navigation/page-header";
import { greetingFor } from "@/lib/dates";
import { pendingLabel } from "@/lib/tasks/format";
import { getAgoraView } from "@/lib/tasks/queries";

export const metadata = { title: "Agora" };

export default async function AgoraPage() {
  const view = await getAgoraView();
  const inboxOnly = !view.now && view.pendingCount > 0;

  return (
    <>
      <PageHeader
        eyebrow={greetingFor(new Date())}
        title="O que merece atenção?"
        description={pendingLabel(view.pendingCount)}
      />

      {view.now ? (
        <>
          <NowFocus task={view.now} today={view.today} />
          <TaskSection id="depois-label" label="Depois" tasks={view.next} today={view.today} />
          <TaskSection id="mais-tarde-label" label="Mais tarde" tasks={view.later} today={view.today} quiet />
        </>
      ) : (
        <EmptyState
          icon={Leaf}
          title="Nada pedindo sua atenção agora."
          description={
            inboxOnly
              ? "O que você capturou está na Inbox. Quando algo estiver pronto para fazer, ele aparece aqui."
              : "Quando lembrar de algo, toque em + para anotar."
          }
        />
      )}
    </>
  );
}
