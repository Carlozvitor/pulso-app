import { z } from "zod";
import type { CalendarEvent } from "@/types/event";

export const EVENT_COLUMNS =
  "id, title, description, location, area_id, start_date, start_time, duration_minutes, repeat_days, repeat_until, skipped_dates";

export const eventIdSchema = z.uuid();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

/** O que o formulário manda. Só o título e a data são obrigatórios. */
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, "Dê um nome para o compromisso.").max(200),
    startDate: z.iso.date({ error: "Escolha a data." }),
    /** "19:00"; null = dia todo. */
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")
      .nullable(),
    durationMinutes: z.number().int().min(5).max(1440).nullable(),
    repeatDays: z.array(z.number().int().min(0).max(6)).max(7),
    repeatUntil: z.iso.date().nullable(),
    location: optionalText(200),
    description: optionalText(5000),
    areaId: z.uuid().nullable(),
  })
  .transform((v) => ({
    ...v,
    repeatDays: [...new Set(v.repeatDays)].sort((a, b) => a - b),
    // Dia todo não tem duração; sem repetição não tem fim.
    durationMinutes: v.startTime ? v.durationMinutes : null,
    repeatUntil: v.repeatDays.length > 0 ? v.repeatUntil : null,
  }))
  .refine((v) => !v.repeatUntil || v.repeatUntil >= v.startDate, {
    error: "O fim da repetição precisa ser depois do começo.",
    path: ["repeatUntil"],
  });

export type EventInput = z.input<typeof eventInputSchema>;

export function eventInputToRow(v: z.output<typeof eventInputSchema>) {
  return {
    title: v.title,
    start_date: v.startDate,
    start_time: v.startTime,
    duration_minutes: v.durationMinutes,
    repeat_days: v.repeatDays.length > 0 ? v.repeatDays : null,
    repeat_until: v.repeatUntil,
    location: v.location,
    description: v.description,
    area_id: v.areaId,
  };
}

export const eventRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    location: z.string().nullable(),
    area_id: z.string().nullable(),
    start_date: z.string(),
    // Postgres devolve "19:00:00".
    start_time: z.string().nullable(),
    duration_minutes: z.number().nullable(),
    repeat_days: z.array(z.number()).nullable(),
    repeat_until: z.string().nullable(),
    skipped_dates: z.array(z.string()).nullable(),
  })
  .transform(
    (r): CalendarEvent => ({
      id: r.id,
      title: r.title,
      description: r.description,
      location: r.location,
      areaId: r.area_id,
      startDate: r.start_date,
      startTime: r.start_time ? r.start_time.slice(0, 5) : null,
      durationMinutes: r.duration_minutes,
      repeatDays: r.repeat_days ?? [],
      repeatUntil: r.repeat_until,
      skippedDates: r.skipped_dates ?? [],
    }),
  );
