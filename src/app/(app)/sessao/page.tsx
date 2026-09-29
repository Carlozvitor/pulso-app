import { Timer } from "lucide-react";
import { Page } from "@/components/layout/page";
import { ActiveSession } from "@/components/session/active-session";
import { SessionPicker } from "@/components/session/session-picker";
import { SessionProposal } from "@/components/session/session-proposal";
import { sessionParamsSchema } from "@/lib/sessions/schemas";
import { getActiveSession, getSessionProposal } from "@/lib/sessions/queries";
import { todayIn } from "@/lib/dates";

export const metadata = { title: "Tenho alguns minutos" };

/**
 * Um endereço, três estados:
 * ?min&energia → proposta · sessão aberta → em andamento · senão → escolha.
 * `escolher=1` volta para a escolha mantendo o que já foi marcado.
 */
export default async function SessaoPage({ searchParams }: PageProps<"/sessao">) {
  const params = await searchParams;
  const parsed = sessionParamsSchema.safeParse(params);
  const choice = parsed.success ? { minutes: parsed.data.min, energy: parsed.data.energia } : null;
  const today = todayIn();

  if (parsed.success && choice && params.escolher === undefined) {
    const proposal = await getSessionProposal(choice, parsed.data.pular);
    return (
      <Shell>
        <SessionProposal proposal={proposal} today={today} />
      </Shell>
    );
  }

  const active = choice ? null : await getActiveSession();
  if (active) {
    return (
      <Shell>
        <ActiveSession session={active} today={today} />
      </Shell>
    );
  }

  return (
    <Shell>
      <SessionPicker initial={choice ?? undefined} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Page back icon={Timer} title="Tenho alguns minutos" description="O PULSO monta uma sessão curta que cabe no seu tempo.">
      {children}
    </Page>
  );
}
