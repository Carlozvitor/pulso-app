"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUp, Plus } from "lucide-react";
import { CAPTURE_EVENT, DESKTOP_QUERY, captureWithFeedback } from "@/components/tasks/capture-feedback";

/**
 * Captura rápida da Central: o que está na cabeça vai para A fazer, no PULSO.
 * No PC ela substitui a barra flutuante — N e "Capturar" trazem o foco para cá.
 */
export function CentralCapture() {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
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
    <form
      onSubmit={submit}
      aria-label="Captura rápida"
      className="flex h-13 items-center gap-3 rounded-xl border border-[#2f3461] bg-[#0f1020] pr-2 pl-4 transition-colors duration-(--duration-fast) focus-within:border-primary-soft/70 lg:h-14"
    >
      <Plus aria-hidden className="size-5 shrink-0 text-primary-soft" strokeWidth={1.75} />
      <label htmlFor="captura-central" className="sr-only">
        O que está na sua cabeça?
      </label>
      <input
        ref={inputRef}
        id="captura-central"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={500}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
        placeholder="O que está na sua cabeça?"
        className="min-w-0 flex-1 bg-transparent text-body text-foreground placeholder:text-[#9aa0c8] focus-visible:outline-none lg:text-[0.9375rem]"
      />
      <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-[#1c1e33] px-2 py-1 text-xs text-foreground-secondary sm:inline-flex">
        <Activity aria-hidden className="size-3.5" strokeWidth={1.75} />
        vai para o PULSO
      </span>
      <button
        type="submit"
        disabled={!title}
        aria-label="Adicionar em A fazer"
        className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-foreground transition-colors duration-(--duration-fast) disabled:bg-[#26283f] disabled:text-foreground-subtle"
      >
        <ArrowUp aria-hidden className="size-4" strokeWidth={2.25} />
      </button>
    </form>
  );
}
