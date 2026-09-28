import { cn } from "@/lib/utils";

/** Bloco de skeleton estático (sem pulsar — animação constante distrai). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-surface", className)} />;
}

export function LoadingState({ label = "Carregando" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 pt-2">
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="mt-8 h-40 w-full rounded-lg" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}
