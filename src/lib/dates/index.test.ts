import { describe, expect, it } from "vitest";
import { addDays, dueLabel, endOfWeek, greetingFor, hourIn, timeLabel, todayIn } from ".";

describe("hourIn", () => {
  it("converte para o fuso de Fortaleza (UTC−3)", () => {
    expect(hourIn(new Date("2026-09-28T02:00:00Z"))).toBe(23);
    expect(hourIn(new Date("2026-09-28T12:00:00Z"))).toBe(9);
  });
});

describe("greetingFor", () => {
  it("usa a hora local, não UTC", () => {
    expect(greetingFor(new Date("2026-09-28T08:00:00Z"))).toBe("Bom dia."); // 05h
    expect(greetingFor(new Date("2026-09-28T14:59:00Z"))).toBe("Bom dia."); // 11h59
    expect(greetingFor(new Date("2026-09-28T15:00:00Z"))).toBe("Boa tarde."); // 12h
    expect(greetingFor(new Date("2026-09-28T21:00:00Z"))).toBe("Boa noite."); // 18h
    expect(greetingFor(new Date("2026-09-28T07:59:00Z"))).toBe("Boa noite."); // 04h59
  });
});

describe("todayIn / addDays", () => {
  it("vira o dia pelo fuso local, não por UTC", () => {
    expect(todayIn(new Date("2026-09-29T02:30:00Z"))).toBe("2026-09-28"); // 23h30 em Fortaleza
    expect(todayIn(new Date("2026-09-29T03:00:00Z"))).toBe("2026-09-29");
  });

  it("soma dias atravessando mês", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });
});

describe("endOfWeek", () => {
  it("termina no domingo", () => {
    expect(endOfWeek("2026-09-28")).toBe("2026-10-04"); // segunda → domingo
    expect(endOfWeek("2026-10-03")).toBe("2026-10-04"); // sábado → domingo
    expect(endOfWeek("2026-10-04")).toBe("2026-10-04"); // domingo → hoje
  });
});

describe("dueLabel", () => {
  const today = "2026-09-28"; // segunda
  it.each([
    ["2026-09-28", "Hoje"],
    ["2026-09-29", "Amanhã"],
    ["2026-10-02", "sexta"],
    ["2026-10-05", "5 out"],
    ["2026-09-27", "Era pra ontem"],
    ["2026-09-20", "Era pra 20 set"],
  ])("%s → %s", (due, expected) => {
    expect(dueLabel(due, today)).toBe(expected);
  });
});

describe("timeLabel", () => {
  it("hora e minuto no fuso de Fortaleza (UTC−3)", () => {
    expect(timeLabel(new Date("2026-09-28T17:35:00Z"))).toBe("14:35");
    expect(timeLabel(new Date("2026-09-29T02:05:00Z"))).toBe("23:05");
  });
});
