import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Tarefa" };

export default function TarefaPage() {
  // Fase 3: detalhe e edição da tarefa.
  return (
    <>
      <Link
        href="/agora"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 pr-3 text-sm text-foreground-secondary active:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-5" />
        Agora
      </Link>
      <h1 className="mt-4 text-display font-semibold tracking-tight">Tarefa</h1>
      <p className="mt-2 text-sm text-foreground-subtle">Detalhe e edição chegam na Fase 3.</p>
    </>
  );
}
