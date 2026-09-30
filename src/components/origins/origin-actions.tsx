"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Activity, Plus } from "lucide-react";
import { toast } from "sonner";
import type { OriginTask } from "@/lib/origins/summary";
import { createOriginTask } from "@/lib/actions/client";
import { dueLabel } from "@/lib/dates";
import { formatDuration } from "@/lib/tasks/format";
import { cn } from "@/lib/utils";

/** Onde a ação nova entra. `create` troca o destino (ex.: ligada a uma avaliação); sem ele, entra na origem `id`. */
export type AddActionTarget = {
  id: string;
  name: string;
  placeholder?: string;
  create?: (title: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

/**
 * Ações de uma origem — as tarefas do PULSO que vêm daqui (não é uma lista paralela).
 * Com `addTo`, tem o campo para anotar uma ação nova já com essa origem.
 */
export function OriginActions({
  tasks,
  today,
  addTo,
  empty,
}: {
  tasks: OriginTask[];
  today: string;
  addTo?: AddActionTarget;
  empty: string;
}) {
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  // Aparece na lista no Enter; some sozinha se o servidor recusar.
  const [adding, addOptimistic] = useOptimistic<string[], string>([], (current, title) => [...current, title]);

  function add(title: string) {
    if (!addTo) return;
    startTransition(async () => {
      addOptimistic(title);
      const result = addTo.create ? await addTo.create(title) : await createOriginTask(addTo.id, title);
      if (!result.ok) toast.error(result.error, { action: { label: "Tentar de novo", onClick: () => add(title) } });
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    add(title);
    setDraft("");
  }

  return (
    <div>
      {addTo && (
        <form
          onSubmit={submit}
          aria-label={`Nova ação em ${addTo.name}`}
          className="flex h-12 items-center gap-2.5 rounded-[10px] border border-[#2f3461] bg-[#0f1020] pr-2 pl-3.5 transition-colors duration-(--duration-fast) focus-within:border-primary-soft/70"
        >
          <Plus aria-hidden className="size-4 shrink-0 text-primary-soft" strokeWidth={1.75} />
          <label htmlFor={`nova-acao-${addTo.id}`} className="sr-only">
            {addTo.placeholder ?? `Nova ação em ${addTo.name}`}
          </label>
          <input
            id={`nova-acao-${addTo.id}`}
            autoComplete="off"
            enterKeyHint="done"
            maxLength={500}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
            placeholder={addTo.placeholder ?? `Nova ação em ${addTo.name}…`}
            className="min-w-0 flex-1 bg-transparent text-body text-foreground placeholder:text-[#9aa0c8] focus-visible:outline-none lg:text-sm"
          />
          <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-[#1c1e33] px-2 py-0.5 text-xs text-foreground-secondary sm:inline-flex">
            <Activity aria-hidden className="size-3" strokeWidth={1.75} />A fazer
          </span>
        </form>
      )}

      {tasks.length === 0 && adding.length === 0 ? (
        <p className={cn("rounded-lg bg-black/20 px-3 py-3 text-sm text-white/60", addTo && "mt-3")}>{empty}</p>
      ) : (
        <ul className={cn("grid gap-0.5", addTo && "mt-3")}>
          {tasks.map((task) => (
            <li key={task.id}>
              <ActionRow task={task} today={today} />
            </li>
          ))}
          {adding.map((title, i) => (
            <li key={`adding-${i}`} className="flex min-h-13 items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
              <span aria-hidden className="size-4 shrink-0 rounded-full border-[1.5px] border-[#4b4b52]" />
              <span className="truncate text-sm text-foreground-secondary">{title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionRow({ task, today }: { task: OriginTask; today: string }) {
  const doing = task.status === "IN_PROGRESS";
  const meta = [
    task.context,
    doing ? "em andamento" : task.paused ? "pausada" : null,
    task.estimatedMinutes != null ? formatDuration(task.estimatedMinutes) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const due = task.dueDate ? dueLabel(task.dueDate, today) : null;
  const soon = task.dueDate !== null && task.dueDate <= today;

  return (
    <Link
      href={`/tarefas/${task.id}`}
      className="flex min-h-13 items-center gap-3 rounded-lg bg-black/20 px-3 py-2 transition-colors duration-(--duration-fast) hover:bg-black/35"
    >
      <span
        aria-hidden
        className={cn(
          "size-4 shrink-0 rounded-full border-[1.5px]",
          doing ? "border-success bg-success shadow-[inset_0_0_0_3px_#0c2a1e]" : "border-[#4b4b52]",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{task.title}</span>
        {meta && <span className="block truncate text-caption text-white/50">{meta}</span>}
      </span>
      {due && (
        <span className={cn("tabular shrink-0 text-caption font-semibold", soon ? "text-amber-ink" : "text-white/55")}>
          {due.charAt(0).toUpperCase() + due.slice(1)}
        </span>
      )}
    </Link>
  );
}
