"use client";

import { createContext, useContext, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_COMPACT, SIDEBAR_COOKIE, SIDEBAR_ID } from "./sidebar-state";

const SidebarContext = createContext<{ compact: boolean; toggle: () => void }>({ compact: false, toggle: () => {} });

/** Barra lateral recolhida ou aberta: vale para a barra, para o botão do topo e para quem se alinha a ela. */
export function useSidebar() {
  return useContext(SidebarContext);
}

/**
 * Moldura do app com o estado da barra lateral. `data-sidebar` troca a largura da coluna
 * pelo CSS; o cookie faz o servidor já desenhar do jeito certo na próxima visita.
 */
export function SidebarShell({ initialCompact, children }: { initialCompact: boolean; children: React.ReactNode }) {
  const [compact, setCompact] = useState(initialCompact);

  function toggle() {
    const next = !compact;
    setCompact(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? SIDEBAR_COMPACT : "aberta"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <SidebarContext.Provider value={{ compact, toggle }}>
      <div data-sidebar={compact ? SIDEBAR_COMPACT : "aberta"} className="contents">
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

/** Botão no topo, sempre no mesmo lugar: recolhe e abre a barra lateral. */
export function SidebarToggle({ className }: { className?: string }) {
  const { compact, toggle } = useSidebar();
  const label = compact ? "Abrir barra lateral" : "Recolher barra lateral";
  const Icon = compact ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-expanded={!compact}
      aria-controls={SIDEBAR_ID}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground-subtle transition-colors duration-(--duration-fast) hover:bg-[#141417] hover:text-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-[1.125rem]" strokeWidth={1.75} />
    </button>
  );
}
