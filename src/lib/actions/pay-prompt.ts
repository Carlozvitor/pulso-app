import { toast } from "sonner";
import type { ActionFailure } from "./resilient";

type StatusResult = { ok: true; payPrompt?: string } | ActionFailure;

/**
 * Concluiu uma ação que paga algo do Dinheiro ("Pagar fatura do Nubank")? Depois do toast
 * da própria tela, pergunta se quer marcar como paga — um toque resolve os dois lados.
 */
export function withPayPrompt<A extends [string, ...unknown[]]>(
  setStatus: (...args: A) => Promise<StatusResult>,
  pay: (taskId: string) => Promise<{ ok: true } | ActionFailure>,
) {
  return async (...args: A): Promise<StatusResult> => {
    const result = await setStatus(...args);
    if (result.ok && result.payPrompt) {
      const question = result.payPrompt;
      const [taskId] = args;
      // Um instante depois, para ficar por cima do "Concluída." de quem chamou.
      setTimeout(() => {
        toast(question, {
          duration: 12_000,
          action: {
            label: "Marcar paga",
            onClick: async () => {
              const paid = await pay(taskId);
              if (paid.ok) toast("Marcada como paga no Dinheiro.");
              else toast.error(paid.error);
            },
          },
        });
      }, 350);
    }
    return result;
  };
}
