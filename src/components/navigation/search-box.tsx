import { Search } from "lucide-react";

/** Busca de tarefas: formulário simples (GET /busca). A tecla / foca aqui. */
export function SearchBox({ defaultValue, autoFocus }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/busca" role="search">
      <label className="flex h-12 items-center gap-3 rounded-[10px] border border-border bg-[#0a0a0c] px-4 text-foreground-subtle transition-colors duration-(--duration-fast) focus-within:border-primary-soft/60">
        <Search aria-hidden className="size-[1.125rem] shrink-0" strokeWidth={1.75} />
        <span className="sr-only">Buscar tarefas</span>
        <input
          id="busca"
          name="q"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          maxLength={100}
          placeholder="Buscar tarefas…"
          className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-foreground-subtle focus-visible:outline-none lg:text-sm"
        />
        <kbd className="hidden rounded-[5px] border border-border-strong bg-white/5 px-1.5 font-mono text-[0.6875rem] font-semibold text-foreground-secondary lg:inline">
          /
        </kbd>
      </label>
    </form>
  );
}
