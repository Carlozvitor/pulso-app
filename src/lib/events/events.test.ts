import { describe, expect, it } from "vitest";
import type { Assessment } from "@/types/assessment";
import type { CalendarEvent } from "@/types/event";
import type { Task } from "@/types/task";
import { addMinutesToTime, startOfWeek } from "@/lib/dates";
import { eventDates, isPast, occurrencesBetween, repeatLabel } from "./occurrences";
import { buildDone, buildToday, buildUpcoming, buildWeek } from "./views";

// Quarta, 30 set 2026, 15:00.
const NOW = { date: "2026-09-30", time: "15:00" };

let seq = 0;
function event(partial: Partial<CalendarEvent>): CalendarEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    title: `Compromisso ${seq}`,
    description: null,
    location: null,
    areaId: null,
    startDate: "2026-09-30",
    startTime: "10:00",
    durationMinutes: 60,
    repeatDays: [],
    repeatUntil: null,
    skippedDates: [],
    ...partial,
  };
}

function task(partial: Partial<Task>): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Tarefa ${seq}`,
    description: null,
    status: "TODO",
    importance: null,
    urgency: null,
    energy: null,
    estimatedMinutes: null,
    dueDate: null,
    projectId: null,
    areaId: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    pausedAt: null,
    snoozedUntil: null,
    assessmentId: null,
    ...partial,
  };
}

describe("datas", () => {
  it("semana começa na segunda", () => {
    expect(startOfWeek("2026-09-30")).toBe("2026-09-28");
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28"); // domingo
    expect(startOfWeek("2026-09-28")).toBe("2026-09-28");
  });

  it("soma minutos ao horário, dando a volta na meia-noite", () => {
    expect(addMinutesToTime("19:00", 180)).toBe("22:00");
    expect(addMinutesToTime("23:30", 60)).toBe("00:30");
  });
});

describe("eventDates", () => {
  it("avulso: só o próprio dia, se estiver no intervalo", () => {
    expect(eventDates(event({ startDate: "2026-10-01" }), "2026-09-28", "2026-10-04")).toEqual(["2026-10-01"]);
    expect(eventDates(event({ startDate: "2026-10-10" }), "2026-09-28", "2026-10-04")).toEqual([]);
  });

  it("repete nos dias marcados, a partir do início e até o fim", () => {
    const aula = event({ startDate: "2026-09-28", repeatDays: [1, 3], repeatUntil: "2026-10-07" });
    expect(eventDates(aula, "2026-09-01", "2026-10-31")).toEqual(["2026-09-28", "2026-09-30", "2026-10-05", "2026-10-07"]);
  });

  it("dia pulado sai da repetição", () => {
    const aula = event({ startDate: "2026-09-28", repeatDays: [1, 3], skippedDates: ["2026-09-30"] });
    expect(eventDates(aula, "2026-09-28", "2026-10-04")).toEqual(["2026-09-28"]);
  });
});

describe("isPast", () => {
  const base = { allDay: false, startTime: "14:00", endTime: "15:00" };
  it("termina até agora = passou", () => {
    expect(isPast({ ...base, date: "2026-09-30" }, NOW)).toBe(true);
    expect(isPast({ ...base, date: "2026-09-30", endTime: "15:30" }, NOW)).toBe(false);
  });
  it("dia todo só passa no dia seguinte; outros dias pela data", () => {
    expect(isPast({ date: "2026-09-30", allDay: true, startTime: null, endTime: null }, NOW)).toBe(false);
    expect(isPast({ ...base, date: "2026-09-29" }, NOW)).toBe(true);
    expect(isPast({ ...base, date: "2026-10-01" }, NOW)).toBe(false);
  });
  it("atravessa a meia-noite: hoje ainda não passou", () => {
    expect(isPast({ date: "2026-09-30", allDay: false, startTime: "23:00", endTime: "01:00" }, { date: "2026-09-30", time: "23:30" })).toBe(false);
  });
});

describe("occurrencesBetween", () => {
  it("ordena: dia todo, depois horário", () => {
    const list = occurrencesBetween(
      [event({ title: "tarde", startTime: "14:00" }), event({ title: "dia todo", startTime: null, durationMinutes: null }), event({ title: "manhã", startTime: "06:30" })],
      "2026-09-30",
      "2026-09-30",
      NOW,
    );
    expect(list.map((o) => o.title)).toEqual(["dia todo", "manhã", "tarde"]);
    expect(list.map((o) => o.past)).toEqual([false, true, true]);
    expect(list[1].endTime).toBe("07:30");
  });
});

describe("repeatLabel", () => {
  it("regra em português", () => {
    expect(repeatLabel([], null)).toBeNull();
    expect(repeatLabel([3, 1], "2026-12-12")).toBe("Toda segunda e quarta, até 12 dez");
    expect(repeatLabel([1, 2, 3, 4, 5], null)).toBe("De segunda a sexta");
    expect(repeatLabel([0, 1, 2, 3, 4, 5, 6], null)).toBe("Todo dia");
    expect(repeatLabel([6], null)).toBe("Todo sábado");
    expect(repeatLabel([1, 3, 5], null)).toBe("Toda segunda, quarta e sexta");
  });
});

describe("buildWeek", () => {
  it("7 dias de segunda a domingo, com compromissos e prazos do dia", () => {
    const week = buildWeek("2026-09-30", {
      events: [event({ startDate: "2026-09-28", repeatDays: [1, 3] }), event({ startDate: "2026-10-01", title: "Dentista" })],
      tasks: [task({ title: "fatura", dueDate: "2026-09-30" }), task({ title: "vencida", dueDate: "2026-09-20" }), task({ title: "feita", dueDate: "2026-10-01", status: "DONE" })],
      now: NOW,
    });
    expect(week.map((d) => d.weekdayShort)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
    expect(week[2].isToday).toBe(true);
    expect(week[0].occurrences).toHaveLength(1);
    expect(week[3].occurrences.map((o) => o.title)).toEqual(["Dentista"]);
    // Vencido aparece em hoje; concluída não aparece.
    expect(week[2].deadlines.map((t) => t.title).sort()).toEqual(["fatura", "vencida"]);
    expect(week[3].deadlines).toEqual([]);
  });
});

describe("buildToday, buildUpcoming e buildDone", () => {
  const events = [
    event({ title: "manhã", startTime: "06:30" }),
    event({ title: "tarde", startTime: "16:00" }),
    event({ title: "amanhã", startDate: "2026-10-01" }),
    event({ title: "ontem", startDate: "2026-09-29" }),
    event({ title: "longe", startDate: "2026-12-01" }),
  ];

  it("hoje traz todos do dia, marcando o que passou", () => {
    const today = buildToday({ events, tasks: [], now: NOW });
    expect(today.occurrences.map((o) => [o.title, o.past])).toEqual([["manhã", true], ["tarde", false]]);
  });

  it("próximos: só o que vem, em 30 dias", () => {
    expect(buildUpcoming({ events, now: NOW }).flatMap((d) => d.occurrences.map((o) => o.title))).toEqual(["tarde", "amanhã"]);
  });

  it("concluídos: o que passou, mais recente primeiro", () => {
    expect(buildDone({ events, now: NOW }).flatMap((d) => d.occurrences.map((o) => o.title))).toEqual(["manhã", "ontem"]);
  });
});

describe("avaliações na agenda", () => {
  function assessment(partial: Partial<Assessment>): Assessment {
    seq += 1;
    return {
      id: `av${seq}`,
      areaId: "mkt",
      kind: "PROVA",
      title: `AV${seq}`,
      dueDate: null,
      dueTime: null,
      location: null,
      maxGrade: null,
      grade: null,
      notes: null,
      doneAt: null,
      createdAt: "2026-08-01T00:00:00Z",
      ...partial,
    };
  }
  const assessments = [
    assessment({ title: "AV1", dueDate: "2026-10-01", dueTime: "19:00", location: "Bloco B" }),
    assessment({ kind: "TRABALHO", title: "Trabalho final", dueDate: "2026-10-05" }),
    assessment({ kind: "ATIVIDADE", title: "Lista 3", dueDate: "2026-09-29" }),
    assessment({ title: "Prova passada", dueDate: "2026-09-28" }),
    assessment({ kind: "TRABALHO", title: "Entregue", dueDate: "2026-09-25", doneAt: "2026-09-25T10:00:00Z" }),
    assessment({ title: "Sem data" }),
  ];
  const areaLabel = (id: string | null) => (id === "mkt" ? "Marketing Digital" : null);

  it("semana: prova no dia dela; trabalho que passou sem entregar vai para hoje", () => {
    const week = buildWeek("2026-09-30", { events: [], tasks: [], assessments, now: NOW, areaLabel });
    expect(week[0].assessments.map((a) => a.title)).toEqual(["Prova passada"]);
    expect(week[1].assessments).toEqual([]);
    expect(week[2].assessments.map((a) => [a.title, a.state])).toEqual([["Atividade · Lista 3", "late"]]);
    expect(week[3].assessments[0]).toMatchObject({ title: "Prova · AV1", time: "19:00", location: "Bloco B", context: "Marketing Digital" });
  });

  it("hoje e próximos: só pendentes; concluídos: o que já foi", () => {
    expect(buildToday({ events: [], tasks: [], assessments, now: NOW }).assessments.map((a) => a.title)).toEqual(["Atividade · Lista 3"]);
    const upcoming = buildUpcoming({ events: [], assessments, now: NOW });
    expect(upcoming.map((d) => d.date)).toEqual(["2026-09-30", "2026-10-01", "2026-10-05"]);
    expect(upcoming.flatMap((d) => d.assessments.map((a) => a.title))).toEqual([
      "Atividade · Lista 3",
      "Prova · AV1",
      "Entrega · Trabalho final",
    ]);
    expect(buildDone({ events: [], assessments, now: NOW }).flatMap((d) => d.assessments.map((a) => a.title))).toEqual([
      "Prova passada",
      "Entrega · Entregue",
    ]);
  });
});
