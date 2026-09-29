"use client";

import { CloudUpload } from "lucide-react";
import { usePendingCaptures } from "@/lib/tasks/pending-captures";

/**
 * Capturas ainda guardadas no aparelho (sem conexão). Somem sozinhas quando chegam no servidor.
 * `savedIds`: as que o servidor já tem — não aparecem duas vezes no instante da troca.
 */
export function PendingCaptureList({ savedIds = [] }: { savedIds?: string[] }) {
  const pending = usePendingCaptures();
  const saved = new Set(savedIds);
  const waiting = pending.filter((c) => !saved.has(c.id));
  if (waiting.length === 0) return null;

  return (
    <ul aria-label="Guardadas no aparelho" className="panel mb-6 divide-y divide-border px-4">
      {waiting.map((capture) => (
        <li key={capture.id} className="flex min-h-14 items-center gap-2 py-3">
          <span className="-ml-2.5 flex size-11 shrink-0 items-center justify-center">
            <CloudUpload aria-hidden className="size-5 text-muted-ui" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body text-foreground-secondary">{capture.title}</span>
            <span className="block truncate text-caption text-foreground-subtle">
              Guardada aqui · vai quando a conexão voltar
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
