"use client";

import { createContext, useContext, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONEY_COOKIE, MONEY_HIDDEN } from "./privacy-state";

const PrivacyContext = createContext<{ hidden: boolean; toggle: () => void }>({ hidden: false, toggle: () => {} });

/**
 * Valores do Dinheiro à vista ou escondidos. `data-valores` esconde pelo CSS; o cookie
 * faz o servidor já desenhar do jeito certo na próxima visita (o aparelho lembra).
 */
export function MoneyPrivacyShell({ initialHidden, children }: { initialHidden: boolean; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(initialHidden);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    document.cookie = `${MONEY_COOKIE}=${next ? MONEY_HIDDEN : "visiveis"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      <div data-valores={hidden ? MONEY_HIDDEN : "visiveis"} className="contents">
        {children}
      </div>
    </PrivacyContext.Provider>
  );
}

/** O olho: esconde ou mostra os valores (aqui, no cartão e na Central). */
export function EyeToggle({ className }: { className?: string }) {
  const { hidden, toggle } = useContext(PrivacyContext);
  const label = hidden ? "Mostrar valores" : "Esconder valores";
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={hidden}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-elevated text-foreground-secondary transition-colors duration-(--duration-fast) hover:text-foreground lg:size-10",
        hidden && "border-green-line text-green-ink",
        className,
      )}
    >
      <Icon aria-hidden className="size-[1.0625rem]" strokeWidth={1.75} />
    </button>
  );
}
