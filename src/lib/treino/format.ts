import type { EntryValues, ExerciseKind } from "@/types/workout";

export const KIND_LABEL: Record<ExerciseKind, string> = {
  LOAD: "Carga",
  BODYWEIGHT: "Peso do corpo",
  TIME: "Tempo",
};

/** Unidade da meta e da evolução de cada tipo. */
export const KIND_UNIT: Record<ExerciseKind, string> = {
  LOAD: "kg",
  BODYWEIGHT: "rep.",
  TIME: "min",
};

export const EMPTY_VALUES: EntryValues = { sets: null, reps: null, loadKg: null, minutes: null };

/** Número no jeito brasileiro, sem zeros sobrando: 40 · 42,5 · 22,25. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

/**
 * Número digitado ("42,5", "42.5", " 40 "). Vazio = null; texto que não é número = undefined
 * (a tela avisa e volta ao valor anterior).
 */
export function parseNumber(text: string): number | null | undefined {
  const clean = text.trim().replace(",", ".");
  if (!clean) return null;
  if (!/^\d+(\.\d+)?$/.test(clean)) return undefined;
  return Number(clean);
}

function setsAndReps({ sets, reps }: EntryValues): string | null {
  if (sets && reps) return `${sets}×${reps}`;
  if (sets) return sets === 1 ? "1 série" : `${sets} séries`;
  if (reps) return `${reps} rep.`;
  return null;
}

/** Uma linha: "4×10 · 40 kg" (Carga) · "3×15" (Peso do corpo) · "25 min" (Tempo). Sem números, "–". */
export function formatValues(kind: ExerciseKind, values: EntryValues): string {
  let text: string | null;
  if (kind === "TIME") text = values.minutes ? `${values.minutes} min` : null;
  else if (kind === "BODYWEIGHT") text = setsAndReps(values);
  else text = [setsAndReps(values), values.loadKg ? `${formatNumber(values.loadKg)} kg` : null].filter(Boolean).join(" · ") || null;
  return text ?? "–";
}

/** O número que mede a evolução: kg (Carga), repetições (Peso do corpo) ou minutos (Tempo). */
export function metricOf(kind: ExerciseKind, values: EntryValues): number | null {
  if (kind === "LOAD") return values.loadKg;
  if (kind === "BODYWEIGHT") return values.reps;
  return values.minutes;
}

/** "+5 kg" · "−2,5 kg" · "+2 rep." · "+1 série" · "igual". `up`: subiu (para pintar de lima). */
export type Change = { label: string; direction: "up" | "down" | "same" };

function signed(diff: number, unit: string): string {
  return `${diff > 0 ? "+" : "−"}${formatNumber(Math.abs(diff))} ${unit}`;
}

/**
 * De uma vez para a outra. Na Carga, vale primeiro o peso; com o mesmo peso, as repetições
 * e depois as séries (4×8 → 4×10 a 40 kg também é evolução).
 */
export function compareValues(kind: ExerciseKind, before: EntryValues, after: EntryValues): Change {
  const steps: [from: number | null, to: number | null, unit: "kg" | "rep." | "série" | "min"][] = [];
  if (kind === "TIME") steps.push([before.minutes, after.minutes, "min"]);
  else {
    if (kind === "LOAD") steps.push([before.loadKg, after.loadKg, "kg"]);
    steps.push([before.reps, after.reps, "rep."], [before.sets, after.sets, "série"]);
  }
  for (const [from, to, unit] of steps) {
    if (from === null || to === null || from === to) continue;
    const diff = Math.round((to - from) * 100) / 100;
    const shown = unit === "série" && Math.abs(diff) !== 1 ? "séries" : unit;
    return { label: signed(diff, shown), direction: diff > 0 ? "up" : "down" };
  }
  return { label: "igual", direction: "same" };
}

/** Mesmos números? (para mostrar o valor "da última vez" tracejado). */
export function sameValues(a: EntryValues, b: EntryValues): boolean {
  return a.sets === b.sets && a.reps === b.reps && a.loadKg === b.loadKg && a.minutes === b.minutes;
}

/** Só os números que o tipo usa (o resto vira null). */
export function valuesFor(kind: ExerciseKind, values: EntryValues): EntryValues {
  if (kind === "TIME") return { ...EMPTY_VALUES, minutes: values.minutes };
  if (kind === "BODYWEIGHT") return { ...EMPTY_VALUES, sets: values.sets, reps: values.reps };
  return { ...EMPTY_VALUES, sets: values.sets, reps: values.reps, loadKg: values.loadKg };
}

/** "1 exercício" · "5 exercícios" */
export function exercisesLabel(n: number): string {
  return n === 1 ? "1 exercício" : `${n} exercícios`;
}
