"use client";

import { cn } from "@/lib/utils";

export type ChipOption<T> = { value: T; label: string };

type ChipGroupProps<T> = {
  labelId: string;
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Linha rolável na horizontal (muitas opções, ex.: duração). */
  scroll?: boolean;
  children?: React.ReactNode;
};

export const chipClass = (selected: boolean) =>
  cn(
    "inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast)",
    selected
      ? "border-primary-soft bg-primary-soft/15 text-foreground"
      : "border-border text-foreground-secondary hover:bg-elevated/60 active:bg-elevated",
  );

/** Escolha única; tocar na opção marcada limpa o valor. */
export function ChipGroup<T extends string | number>({
  labelId,
  options,
  value,
  onChange,
  scroll,
  children,
}: ChipGroupProps<T>) {
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cn(
        "flex gap-2",
        scroll ? "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "flex-wrap",
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : option.value)}
            className={chipClass(selected)}
          >
            {option.label}
          </button>
        );
      })}
      {children}
    </div>
  );
}
