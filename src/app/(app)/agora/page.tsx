import { Leaf } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { NowFocus } from "@/components/agora/now-focus";
import { TaskSection } from "@/components/agora/task-section";
import { PageHeader } from "@/components/navigation/page-header";
import { greetingFor } from "@/lib/dates";
import { pendingLabel } from "@/lib/tasks/format";
import { EMPTY_AGORA, SAMPLE_AGORA } from "@/lib/tasks/sample";

export const metadata = { title: "Agora" };

export default async function AgoraPage({ searchParams }: PageProps<"/agora">) {
  // Fase 2: dados de exemplo. `?estado=vazio` mostra o estado vazio para revisão.
  const { estado } = await searchParams;
  const view = estado === "vazio" ? EMPTY_AGORA : SAMPLE_AGORA;

  return (
    <>
      <PageHeader
        eyebrow={greetingFor(new Date())}
        title="O que merece atenção?"
        description={pendingLabel(view.pendingCount)}
      />

      {view.now ? (
        <>
          <NowFocus task={view.now} />
          <TaskSection id="depois-label" label="Depois" tasks={view.next} />
          <TaskSection id="mais-tarde-label" label="Mais tarde" tasks={view.later} quiet />
        </>
      ) : (
        <EmptyState
          icon={Leaf}
          title="Nada pedindo sua atenção agora."
          description="Quando lembrar de algo, toque em + para anotar."
        />
      )}
    </>
  );
}
