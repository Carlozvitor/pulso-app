"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, CloudUpload, ListTodo } from "lucide-react";
import { CAPTURE_EVENT, DESKTOP_QUERY, captureWithFeedback } from "@/components/tasks/capture-feedback";
import { usePendingCaptures } from "@/lib/tasks/pending-captures";

/**
 * Captura no PC: barra flutuante no centro, embaixo do painel principal — sempre à mão.
 * Enter adiciona em A fazer; N ou "Capturar" trazem o foco para cá; Esc sai do campo.
 * Na Central ela some: lá a captura já está no topo da tela.
 */
export function CaptureDock() {
  const onCentral = usePathname() === "/central";
  return onCentral ? null : <Dock />;
}

function Dock() {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = usePendingCaptures();
  const title = value.trim();

  useEffect(() => {
    const focus = () => {
      if (window.matchMedia(DESKTOP_QUERY).matches) inputRef.current?.focus();
    };
    window.addEventListener(CAPTURE_EVENT, focus);
    return () => window.removeEventListener(CAPTURE_EVENT, focus);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title) return;
    void captureWithFeedback(title);
    setValue("");
  }

  return (
    // Centralizada sobre o painel principal (à direita da barra lateral), não sobre a tela toda.
    <div className="pointer-events-none fixed right-2 bottom-5 left-[calc(var(--sidebar-width)+1.25rem)] z-30 hidden justify-center px-6 lg:flex">
      <form
        onSubmit={submit}
        aria-label="Capturar"
        className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-border-strong bg-[#16161a] py-2.5 pr-2.5 pl-4 shadow-[0_12px_40px_rgb(0_0_0/0.55)] transition-colors duration-(--duration-fast) focus-within:border-primary-soft/60"
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#222227] px-2 py-1 text-xs text-foreground-secondary">
          <ListTodo aria-hidden className="size-3.5" strokeWidth={1.75} />
          A fazer
        </span>
        <label htmlFor="captura" className="sr-only">
          O que você precisa fazer?
        </label>
        <input
          ref={inputRef}
          id="captura"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={500}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
          placeholder="O que você precisa fazer?"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-subtle focus-visible:outline-none"
        />
        {pending.length > 0 && (
          <span
            title="Guardadas no aparelho — vão para A fazer quando a conexão voltar"
            className="tabular inline-flex shrink-0 items-center gap-1 text-xs text-foreground-subtle"
          >
            <CloudUpload aria-hidden className="size-3.5" strokeWidth={1.75} />
            {pending.length} guardada{pending.length > 1 ? "s" : ""}
          </span>
        )}
        {!title && (
          <kbd className="shrink-0 rounded-[5px] border border-border-strong bg-white/5 px-1.5 font-mono text-[0.6875rem] font-semibold text-foreground-subtle">
            N
          </kbd>
        )}
        <button
          type="submit"
          disabled={!title}
          aria-label="Adicionar em A fazer"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-(--duration-fast) disabled:bg-[#26262b] disabled:text-foreground-subtle"
        >
          <ArrowUp aria-hidden className="size-4" strokeWidth={2.25} />
        </button>
      </form>
    </div>
  );
}
