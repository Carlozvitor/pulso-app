import { describe, expect, it } from "vitest";
import { eventInputSchema, eventRowSchema } from "./schemas";

const base = {
  title: " Aula de Marketing ",
  startDate: "2026-09-28",
  startTime: "19:00",
  durationMinutes: 180,
  repeatDays: [3, 1, 1],
  repeatUntil: "2026-12-12",
  location: "  ",
  description: null,
  areaId: null,
};

describe("eventInputSchema", () => {
  it("limpa o que veio do formulário", () => {
    const v = eventInputSchema.parse(base);
    expect(v.title).toBe("Aula de Marketing");
    expect(v.repeatDays).toEqual([1, 3]);
    expect(v.location).toBeNull();
  });

  it("dia todo não guarda duração; sem repetição não guarda fim", () => {
    const v = eventInputSchema.parse({ ...base, startTime: null, repeatDays: [] });
    expect(v.durationMinutes).toBeNull();
    expect(v.repeatUntil).toBeNull();
  });

  it("recusa título vazio, horário inválido e fim antes do começo", () => {
    expect(eventInputSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, startTime: "25:00" }).success).toBe(false);
    const early = eventInputSchema.safeParse({ ...base, repeatUntil: "2026-09-01" });
    expect(early.success).toBe(false);
    expect(early.error?.issues[0].message).toMatch(/fim da repetição/);
  });
});

describe("eventRowSchema", () => {
  it("horário do Postgres vira HH:MM; listas nulas viram vazias", () => {
    const e = eventRowSchema.parse({
      id: "1",
      title: "Dentista",
      description: null,
      location: null,
      area_id: null,
      start_date: "2026-10-01",
      start_time: "09:00:00",
      duration_minutes: 60,
      repeat_days: null,
      repeat_until: null,
      skipped_dates: null,
    });
    expect(e.startTime).toBe("09:00");
    expect(e.repeatDays).toEqual([]);
    expect(e.skippedDates).toEqual([]);
  });
});
