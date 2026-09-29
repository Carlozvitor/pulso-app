/** Fuso do usuário. App pessoal: fixo por enquanto. */
export const TIME_ZONE = "America/Fortaleza";

/** Hora (0–23) de uma data no fuso do usuário. */
export function hourIn(date: Date, timeZone: string = TIME_ZONE): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  }).format(date);
  return Number(hour);
}

export function greetingFor(date: Date, timeZone: string = TIME_ZONE): string {
  const hour = hourIn(date, timeZone);
  if (hour >= 5 && hour < 12) return "Bom dia.";
  if (hour >= 12 && hour < 18) return "Boa tarde.";
  return "Boa noite.";
}

/** "14:35" no fuso do usuário. */
export function timeLabel(date: Date, timeZone: string = TIME_ZONE): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(date);
}

/** Data de hoje (YYYY-MM-DD) no fuso do usuário. */
export function todayIn(now: Date = new Date(), timeZone: string = TIME_ZONE): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** Soma dias a uma data YYYY-MM-DD (sem hora, sem fuso). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de uma data YYYY-MM-DD. */
function weekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/** "Esta semana" termina no domingo. Se hoje já é domingo, é hoje. */
export function endOfWeek(today: string): string {
  const day = weekday(today);
  return addDays(today, day === 0 ? 0 : 7 - day);
}

/** Diferença em dias entre duas datas YYYY-MM-DD (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Rótulo curto e neutro para prazo — nunca "atrasado".
 * Hoje · Amanhã · sexta · 3 out · Era pra ontem · Era pra 3 out
 */
export function dueLabel(dueDate: string, today: string): string {
  const diff = daysBetween(today, dueDate);
  const [, m, d] = dueDate.split("-").map(Number);
  const short = `${d} ${MONTHS[m - 1]}`;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Era pra ontem";
  if (diff < -1) return `Era pra ${short}`;
  if (diff < 7) return WEEKDAYS[weekday(dueDate)];
  return short;
}
