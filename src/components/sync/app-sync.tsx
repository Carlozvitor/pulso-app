"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOnline } from "@/hooks/use-online";
import { flushCaptures } from "@/lib/tasks/pending-captures";

/** Fora do app por mais que isso → ao voltar, busca os dados de novo. */
const STALE_AFTER_MS = 30_000;

function announceSent(sent: number) {
  if (sent === 0) return;
  toast(sent === 1 ? "A captura guardada chegou em A fazer." : `${sent} capturas guardadas chegaram em A fazer.`);
}

/**
 * Mantém a tela em dia sem a pessoa pensar nisso:
 * - ao voltar para o app (depois de 30 s fora) ou quando a internet volta, atualiza os dados;
 * - manda para A fazer as capturas que ficaram guardadas no aparelho;
 * - sem conexão, mostra um aviso discreto acima da navegação.
 */
export function AppSync() {
  const router = useRouter();
  const online = useOnline();

  useEffect(() => {
    let hiddenAt: number | null = null;

    async function catchUp() {
      announceSent(await flushCaptures());
      router.refresh();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= STALE_AFTER_MS) void catchUp();
      hiddenAt = null;
    }

    // Ao abrir: o que foi capturado offline (inclusive na página sem conexão) segue para A fazer.
    void flushCaptures().then(announceSent);

    window.addEventListener("online", catchUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", catchUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+var(--bottom-nav-height)+0.75rem)] z-30 flex justify-center px-4 lg:bottom-24"
    >
      {!online && (
        <p className="flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-caption text-foreground-secondary">
          <WifiOff aria-hidden className="size-4 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
          Sem conexão. O que você capturar fica guardado.
        </p>
      )}
    </div>
  );
}
