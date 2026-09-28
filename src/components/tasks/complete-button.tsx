"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CompleteButtonProps = {
  title: string;
  done?: boolean;
  onComplete: () => void;
};

/** Círculo de concluir — alvo de 44px, visual de 22px. */
export function CompleteButton({ title, done, onComplete }: CompleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onComplete}
      aria-label={`Concluir: ${title}`}
      aria-pressed={done}
      className="group -ml-2.5 flex size-11 shrink-0 items-center justify-center"
    >
      <span
        className={cn(
          "flex size-[22px] items-center justify-center rounded-full border-[1.5px] transition-colors duration-(--duration-fast)",
          done ? "border-success bg-success text-background" : "border-muted-ui group-active:border-foreground-secondary",
        )}
      >
        {done && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
