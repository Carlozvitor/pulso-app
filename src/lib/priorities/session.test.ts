import { describe, expect, it } from "vitest";
import type { Task } from "@/types/task";
import { buildSession, fitsEnergy, isSessionActive, sessionEndsAt } from "./session";

const TODAY = "2026-09-28";
let seq = 0;
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
    estimatedMinutes: 10,
    dueDate: null,
    projectId: null,
    areaId: null,
    createdAt: `2026-09-28T12:00:${String(seq).padStart(2, "0")}Z`,
    updatedAt: "2026-09-28T12:00:00Z",
    completedAt: null,
    ...partial,
  };
}

const titles = (tasks: Task[]) => tasks.map((t) => t.title);

describe("fitsEnergy", () => {
  it("Baixa só leves · Normal leves e médias · Alta todas · sem energia cabe sempre", () => {
    expect(fitsEnergy("LOW", "LOW")).toBe(true);
    expect(fitsEnergy("MEDIUM", "LOW")).toBe(false);
    expect(fitsEnergy("MEDIUM", "MEDIUM")).toBe(true);
    expect(fitsEnergy("HIGH", "MEDIUM")).toBe(false);
    expect(fitsEnergy("HIGH", "HIGH")).toBe(true);
    expect(fitsEnergy(null, "LOW")).toBe(true);
  });
});

describe("buildSession", () => {
  it("coloca por prioridade o que ainda cabe; tarefa maior que o tempo fica de fora", () => {
    const plan = buildSession(
      [
        task({ title: "longa e importante", importance: 5, estimatedMinutes: 45 }),
        task({ title: "média", importance: 3, estimatedMinutes: 20 }),
        task({ title: "curta", importance: 1, estimatedMinutes: 10 }),
        task({ title: "não cabe mais", importance: 1, estimatedMinutes: 20 }),
      ],
      { minutes: 30, energy: "HIGH", today: TODAY },
    );
    expect(titles(plan.tasks)).toEqual(["média", "curta"]);
    expect(plan.plannedMinutes).toBe(30);
  });

  it("sem duração conta como 15 min", () => {
    const plan = buildSession([task({ estimatedMinutes: null }), task({ estimatedMinutes: null })], {
      minutes: 20,
      energy: "MEDIUM",
      today: TODAY,
    });
    expect(plan.tasks).toHaveLength(1);
    expect(plan.plannedMinutes).toBe(15);
  });

  it("filtra pela energia", () => {
    const plan = buildSession(
      [task({ title: "pesada", energy: "HIGH" }), task({ title: "leve", energy: "LOW" }), task({ title: "sem" })],
      { minutes: 60, energy: "LOW", today: TODAY },
    );
    expect(titles(plan.tasks).sort()).toEqual(["leve", "sem"]);
  });

  it("com energia Alta, a pesada sobe na frente de uma igual", () => {
    const plan = buildSession(
      [task({ title: "normal", energy: "MEDIUM" }), task({ title: "pesada", energy: "HIGH" })],
      { minutes: 60, energy: "HIGH", today: TODAY },
    );
    expect(titles(plan.tasks)).toEqual(["pesada", "normal"]);
  });

  it("em andamento primeiro", () => {
    const plan = buildSession(
      [task({ title: "urgente", importance: 5, dueDate: TODAY }), task({ title: "fazendo", status: "IN_PROGRESS" })],
      { minutes: 60, energy: "MEDIUM", today: TODAY },
    );
    expect(titles(plan.tasks)).toEqual(["fazendo", "urgente"]);
  });

  it("só candidatas da Agora e nunca mais que 5", () => {
    const plan = buildSession(
      [
        ...Array.from({ length: 8 }, () => task({ estimatedMinutes: 5 })),
        task({ title: "inbox", status: "INBOX" }),
        task({ title: "feita", status: "DONE" }),
      ],
      { minutes: 120, energy: "HIGH", today: TODAY },
    );
    expect(plan.tasks).toHaveLength(5);
    expect(titles(plan.tasks)).not.toContain("inbox");
    expect(titles(plan.tasks)).not.toContain("feita");
  });

  it("'Agora não' tira a tarefa e puxa a próxima que couber", () => {
    const first = task({ title: "primeira", importance: 5, estimatedMinutes: 30 });
    const second = task({ title: "segunda", importance: 3, estimatedMinutes: 30 });
    const opts = { minutes: 30, energy: "MEDIUM" as const, today: TODAY };
    expect(titles(buildSession([first, second], opts).tasks)).toEqual(["primeira"]);
    expect(titles(buildSession([first, second], { ...opts, skip: new Set([first.id]) }).tasks)).toEqual(["segunda"]);
  });

  it("nada cabe: sessão vazia", () => {
    const plan = buildSession([task({ estimatedMinutes: 60 })], { minutes: 10, energy: "HIGH", today: TODAY });
    expect(plan).toEqual({ tasks: [], plannedMinutes: 0 });
  });
});

describe("isSessionActive / sessionEndsAt", () => {
  const session = { startedAt: "2026-09-28T17:00:00Z", endedAt: null, availableMinutes: 30 };

  it("vale por 3× o tempo (mínimo 1 h) e some depois, sem precisar encerrar", () => {
    expect(isSessionActive(session, new Date("2026-09-28T18:29:00Z"))).toBe(true);
    expect(isSessionActive(session, new Date("2026-09-28T18:31:00Z"))).toBe(false);
    expect(isSessionActive({ ...session, availableMinutes: 10 }, new Date("2026-09-28T17:59:00Z"))).toBe(true);
  });

  it("encerrada não está ativa", () => {
    expect(isSessionActive({ ...session, endedAt: "2026-09-28T17:20:00Z" }, new Date("2026-09-28T17:21:00Z"))).toBe(
      false,
    );
  });

  it("termina em início + tempo", () => {
    expect(sessionEndsAt(session).toISOString()).toBe("2026-09-28T17:30:00.000Z");
  });
});
