"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Dumbbell, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { EXERCISE_KINDS, type ExerciseKind } from "@/types/workout";
import type { ActionFailure } from "@/lib/actions/resilient";
import type { CatalogItem } from "@/lib/treino/pages";
import type { ExerciseTarget } from "@/lib/treino/schemas";
import { KIND_LABEL } from "@/lib/treino/format";
import { cn } from "@/lib/utils";

/** Sem acento e sem diferença de maiúsculas ("flexao" acha "Flexão"). */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

const SHOWN = 6;

/**
 * "Adicionar exercício": procura no catálogo (os feitos mais recentemente primeiro) ou cria
 * um novo na hora, escolhendo o tipo uma vez só. Enter adiciona o que bate exato ou cria.
 */
export function ExerciseAdder({
  catalog,
  exclude,
  onAdd,
  placeholder = "Adicionar exercício",
}: {
  catalog: CatalogItem[];
  /** Já estão no treino/ficha. */
  exclude: string[];
  onAdd: (target: ExerciseTarget) => Promise<{ ok: true } | { ok: false; error: string } | ActionFailure>;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [kind, setKind] = useState<ExerciseKind>("LOAD");
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const taken = new Set(exclude);
  const term = normalize(text);
  const available = catalog.filter((c) => !taken.has(c.id));
  const matches = (term ? available.filter((c) => normalize(c.name).includes(term)) : available).slice(0, SHOWN);
  const exact = catalog.find((c) => normalize(c.name) === term);
  const canCreate = term.length > 0 && !exact;
  const open = (focused || term.length > 0) && (matches.length > 0 || canCreate || (exact !== undefined && taken.has(exact.id)));

  function add(target: ExerciseTarget) {
    startTransition(async () => {
      const result = await onAdd(target);
      if (!result.ok) return void toast.error(result.error);
      setText("");
      setKind("LOAD");
      input.current?.focus();
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !term) return;
    if (exact) {
      if (taken.has(exact.id)) return void toast(`${exact.name} já está aqui.`);
      return add({ exerciseId: exact.id });
    }
    add({ name: text.trim(), kind });
  }

  // Tocar numa opção não pode tirar o foco do campo antes do clique valer.
  const keepFocus = (event: React.MouseEvent) => event.preventDefault();

  return (
    <form onSubmit={submit} className="rounded-[10px] border border-[#3a4419] bg-[#0b0d06]">
      <label className="flex min-h-12 items-center gap-2.5 px-3.5">
        {pending ? (
          <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-lime-ink" strokeWidth={2} />
        ) : (
          <Plus aria-hidden className="size-4 shrink-0 text-lime-ink" strokeWidth={2} />
        )}
        <span className="sr-only">{placeholder}</span>
        <input
          ref={input}
          aria-controls={open ? listId : undefined}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={80}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="h-12 min-w-0 flex-1 bg-transparent text-body text-foreground placeholder:text-white/45 focus-visible:outline-none lg:text-[0.9375rem]"
        />
      </label>

      {open && (
        <ul id={listId} aria-label="Exercícios para adicionar" className="grid gap-0.5 border-t border-[#262b14] p-1.5">
          {!term && <li className="px-2.5 pt-1 pb-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-white/40 uppercase">Feitos por último</li>}
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => add({ exerciseId: item.id })}
                disabled={pending}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-left text-sm transition-colors duration-(--duration-fast) hover:bg-[#1a1e0e]",
                  exact?.id === item.id && "bg-[#1a1e0e]",
                )}
              >
                <Dumbbell aria-hidden className="size-4 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="shrink-0 text-caption text-foreground-subtle">
                  {KIND_LABEL[item.kind]}
                  {item.last ? ` · última ${item.last}` : ""}
                </span>
              </button>
            </li>
          ))}
          {exact && taken.has(exact.id) && <li className="px-2.5 py-2 text-caption text-foreground-subtle">{exact.name} já está aqui.</li>}
          {canCreate && (
            <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[7px] px-2.5 py-2">
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => add({ name: text.trim(), kind })}
                disabled={pending}
                className="inline-flex min-h-11 min-w-0 items-center gap-2.5 text-left text-sm font-medium text-lime-ink"
              >
                <Plus aria-hidden className="size-4 shrink-0" strokeWidth={2} />
                <span className="truncate">Criar “{text.trim()}”</span>
              </button>
              <span role="group" aria-label="Tipo do exercício novo" className="ml-auto flex flex-wrap gap-1.5">
                {EXERCISE_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onMouseDown={keepFocus}
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "inline-flex h-8 items-center rounded-md border px-2.5 text-caption transition-colors duration-(--duration-fast)",
                      kind === k ? "border-lime-line bg-lime-tile text-lime-ink" : "border-border-strong text-foreground-secondary hover:text-foreground",
                    )}
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </span>
            </li>
          )}
        </ul>
      )}
    </form>
  );
}
