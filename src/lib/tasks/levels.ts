import type { Energy, Scale } from "@/types/task";

/** Importância e urgência: 0–5 no banco, 3 níveis na interface. */
export type Level = "LOW" | "MEDIUM" | "HIGH";

export const LEVEL_TO_SCALE: Record<Level, Scale> = { LOW: 1, MEDIUM: 3, HIGH: 5 };

export function scaleToLevel(value: Scale | null): Level | null {
  if (value == null) return null;
  if (value <= 1) return "LOW";
  if (value <= 3) return "MEDIUM";
  return "HIGH";
}

export const LEVEL_LABEL: Record<Level, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };

export const ENERGY_LABEL: Record<Energy, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };

/** Atalhos de duração (minutos). */
export const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90] as const;
