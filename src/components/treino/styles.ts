import { cn } from "@/lib/utils";

/** Botão lima do cabeçalho ("Registrar treino", "Concluir treino"). */
export const limeButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lime-ink px-3.5 text-sm font-semibold text-[#141a04] transition-[filter] duration-(--duration-fast) hover:brightness-110 disabled:opacity-60 lg:h-10 [&_svg]:size-4";

/** Botão secundário do cabeçalho, com moldura ("Exercícios", "Salvar como ficha"). */
export const quietButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border-strong bg-elevated px-3.5 text-sm font-medium text-foreground transition-[filter] duration-(--duration-fast) hover:brightness-125 disabled:opacity-60 lg:h-10 [&_svg]:size-4 [&_svg]:text-foreground-secondary";

/** Chip de escolha na família lima (tipo do exercício, meta da semana). */
export const limeChip = (selected: boolean) =>
  cn(
    "inline-flex h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast)",
    selected ? "border-lime-line bg-lime-tile text-[#ecfccb]" : "border-border text-foreground-secondary hover:bg-elevated/60 active:bg-elevated",
  );

/** Selo do tipo do exercício ("Carga", "Peso do corpo", "Tempo"). */
export const kindTag = "inline-flex h-5 shrink-0 items-center rounded-[5px] bg-white/7 px-1.5 text-[0.6875rem] font-semibold text-foreground-secondary";

/** Caixa de número do treino (séries, repetições, carga, minutos). */
export const numberField =
  "tabular h-11 w-14 rounded-lg border border-[#3a4419] bg-[#0b0d06] text-center font-mono text-[0.9375rem] font-semibold text-foreground placeholder:text-white/25 focus-visible:border-lime-ink focus-visible:shadow-[0_0_0_3px_rgb(190_242_100/0.18)] focus-visible:outline-none";
