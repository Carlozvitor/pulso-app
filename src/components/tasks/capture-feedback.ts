import { toast } from "sonner";
import { captureSoon } from "@/lib/tasks/pending-captures";

/** Evento global "quero capturar" — tecla N e botão Capturar do topo. */
export const CAPTURE_EVENT = "pulso:capturar";

/** PC: barra de captura flutuante. Celular: bottom sheet do +. */
export const DESKTOP_QUERY = "(min-width: 64rem)";

/** Captura com o aviso certo para cada desfecho (enviada, guardada no aparelho ou falhou). */
export async function captureWithFeedback(title: string): Promise<void> {
  const outcome = await captureSoon(title);
  if (outcome.status === "sent") toast("Anotado em A fazer.");
  else if (outcome.status === "queued") toast("Guardado. Vai para A fazer quando a conexão voltar.");
  else {
    toast.error(outcome.error, {
      action: { label: "Tentar de novo", onClick: () => void captureWithFeedback(title) },
    });
  }
}
