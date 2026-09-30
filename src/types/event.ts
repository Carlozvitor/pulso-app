/** Compromisso: quando algo acontece (não é tarefa). */
export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** Origem (Trabalho → Valentine…), opcional. */
  areaId: string | null;
  /** Data (YYYY-MM-DD) — a primeira, se repetir. */
  startDate: string;
  /** "19:00"; null = dia todo. */
  startTime: string | null;
  durationMinutes: number | null;
  /** Dias da semana da repetição (0 = domingo … 6 = sábado). Vazio = não repete. */
  repeatDays: number[];
  repeatUntil: string | null;
  /** Dias tirados da repetição ("só este"). */
  skippedDates: string[];
};

/** Um compromisso num dia específico (o que se repete vira várias ocorrências). */
export type Occurrence = {
  eventId: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  location: string | null;
  areaId: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  allDay: boolean;
  recurring: boolean;
  /** Rótulo da origem ("Valentine → Conteúdo"), quando houver. */
  context: string | null;
  /** Já terminou (em relação a agora). */
  past: boolean;
};
