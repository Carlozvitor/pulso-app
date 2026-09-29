import { unstable_rethrow } from "next/navigation";

export const OFFLINE_ERROR = "Sem conexão. Tente de novo quando a internet voltar.";
export const UNREACHABLE_ERROR = "Não deu para falar com o servidor. Tente de novo.";

/** Falha que o app mostra como toast. `retry`: não foi culpa do dado — vale tentar de novo depois. */
export type ActionFailure = { ok: false; error: string; retry?: boolean };

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Server Actions lançam exceção quando a rede cai ou o servidor não responde —
 * sem isso, a tela inteira cai no error.tsx. Aqui toda exceção vira `{ ok: false, retry: true }`;
 * só redirect/notFound do Next seguem adiante (ex.: sessão expirada → login).
 */
export function resilient<A extends unknown[], R extends { ok: boolean }>(action: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R | ActionFailure> => {
    try {
      return await action(...args);
    } catch (error) {
      unstable_rethrow(error);
      console.error(error);
      return { ok: false, error: isOffline() ? OFFLINE_ERROR : UNREACHABLE_ERROR, retry: true };
    }
  };
}
