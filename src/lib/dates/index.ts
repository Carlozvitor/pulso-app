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
