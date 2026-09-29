"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Volta para a tela anterior; se o app abriu direto aqui, vai para Agora. */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/central"))}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 pr-3 text-sm text-foreground-secondary active:text-foreground"
    >
      <ChevronLeft aria-hidden className="size-5" />
      Voltar
    </button>
  );
}
