import type { MonthKey } from "@/types/money";

/*
 * Meses como "YYYY-MM" (ordenam como texto). Datas como "YYYY-MM-DD", sem fuso.
 */

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string | null | undefined): value is MonthKey {
  return typeof value === "string" && MONTH_RE.test(value);
}

/** "2026-09-30" → "2026-09" */
export function monthOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

function parts(month: MonthKey): [number, number] {
  const [y, m] = month.split("-").map(Number);
  return [y, m];
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = parts(month);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Quantos meses de `a` até `b` (b − a). */
export function monthsBetween(a: MonthKey, b: MonthKey): number {
  const [ya, ma] = parts(a);
  const [yb, mb] = parts(b);
  return (yb - ya) * 12 + (mb - ma);
}

/** "2026-09" → "2026-09-01" (como o banco guarda o mês). */
export function monthStart(month: MonthKey): string {
  return `${month}-01`;
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = parts(month);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** O dia do mês; em mês curto, o último dia (31 em fevereiro → 28/29). */
export function dayIn(month: MonthKey, day: number): string {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
}

/** "Setembro 2026" */
export function monthTitle(month: MonthKey): string {
  const [y, m] = parts(month);
  const name = MONTH_NAMES[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

/** "setembro" */
export function monthName(month: MonthKey): string {
  return MONTH_NAMES[parts(month)[1] - 1];
}

/** "abr/27" */
export function monthShort(month: MonthKey): string {
  const [y, m] = parts(month);
  return `${MONTH_SHORT[m - 1]}/${String(y).slice(2)}`;
}

/** Os meses de `from` até `to`, inclusive. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}
