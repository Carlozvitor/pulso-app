import { describe, expect, it } from "vitest";
import type { Task } from "@/types/task";
import { comparePriority, dueUrgency, effectiveUrgency, priorityScore } from "./score";

// 2026-09-28 é segunda — "esta semana" vai até domingo, 2026-10-04.
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
    estimatedMinutes: null,
    dueDate: null,
    projectId: null,
    areaId: null,
    createdAt: `2026-09-28T12:00:${String(seq).padStart(2, "0")}Z`,
    updatedAt: "2026-09-28T12:00:00Z",
    completedAt: null,
    ...partial,
  };
}

function order(tasks: Task[]): string[] {
  return [...tasks].sort(comparePriority(TODAY)).map((t) => t.title);
}

describe("dueUrgency", () => {
  it("escala do prazo", () => {
    expect(dueUrgency("2026-09-20", TODAY)).toBe(5);
    expect(dueUrgency(TODAY, TODAY)).toBe(5);
    expect(dueUrgency("2026-09-29", TODAY)).toBe(4);
    expect(dueUrgency("2026-10-04", TODAY)).toBe(3);
    expect(dueUrgency("2026-10-05", TODAY)).toBe(2);
    expect(dueUrgency("2026-10-12", TODAY)).toBe(2);
    expect(dueUrgency("2026-10-13", TODAY)).toBe(1);
    expect(dueUrgency(null, TODAY)).toBe(0);
  });

  it("no domingo, esta semana é só hoje", () => {
    expect(dueUrgency("2026-10-05", "2026-10-04")).toBe(4);
    expect(dueUrgency("2026-10-06", "2026-10-04")).toBe(2);
  });
});

describe("effectiveUrgency", () => {
  it("usa a maior entre marcada e prazo, sem somar", () => {
    expect(effectiveUrgency(task({ urgency: 5, dueDate: "2026-10-20" }), TODAY)).toBe(5);
    expect(effectiveUrgency(task({ urgency: 1, dueDate: TODAY }), TODAY)).toBe(5);
    expect(effectiveUrgency(task({}), TODAY)).toBe(0);
  });
});

describe("priorityScore", () => {
  it("importância sem valor conta como Média", () => {
    expect(priorityScore(task({}), TODAY)).toBe(priorityScore(task({ importance: 3 }), TODAY));
  });

  it("bônus de tarefa curta até 15 min", () => {
    const base = priorityScore(task({}), TODAY);
    expect(priorityScore(task({ estimatedMinutes: 15 }), TODAY)).toBe(base + 2);
    expect(priorityScore(task({ estimatedMinutes: 20 }), TODAY)).toBe(base);
  });

  it("+1 por semana parada, até +3", () => {
    const base = priorityScore(task({}), TODAY);
    expect(priorityScore(task({ updatedAt: "2026-09-22T12:00:00Z" }), TODAY)).toBe(base);
    expect(priorityScore(task({ updatedAt: "2026-09-21T12:00:00Z" }), TODAY)).toBe(base + 1);
    expect(priorityScore(task({ updatedAt: "2026-07-01T12:00:00Z" }), TODAY)).toBe(base + 3);
  });
});

describe("comparePriority", () => {
  it("cenário aprovado da Fase 5", () => {
    const tasks = [
      task({ title: "Responder mensagem", estimatedMinutes: 5 }),
      task({ title: "Estudar", importance: 5 }),
      task({ title: "Proposta do cliente", importance: 5, dueDate: "2026-10-02" }),
      task({ title: "Ligar pro fornecedor", importance: 1, dueDate: "2026-09-29" }),
      task({ title: "Pagar boleto", dueDate: TODAY }),
    ];
    // Boleto e proposta empatam em 24 → prazo mais cedo primeiro.
    // Estudar e fornecedor empatam em 15 → fornecedor tem prazo.
    expect(order(tasks)).toEqual([
      "Pagar boleto",
      "Proposta do cliente",
      "Ligar pro fornecedor",
      "Estudar",
      "Responder mensagem",
    ]);
  });

  it("em andamento fica no topo mesmo com nota menor", () => {
    const tasks = [
      task({ title: "urgente", importance: 5, dueDate: TODAY }),
      task({ title: "fazendo", status: "IN_PROGRESS", importance: 1 }),
    ];
    expect(order(tasks)).toEqual(["fazendo", "urgente"]);
  });

  it("várias em andamento: maior nota primeiro", () => {
    const tasks = [
      task({ title: "baixa", status: "IN_PROGRESS", importance: 1 }),
      task({ title: "alta", status: "IN_PROGRESS", importance: 5 }),
    ];
    expect(order(tasks)).toEqual(["alta", "baixa"]);
  });

  it("empate total: a mais antiga primeiro", () => {
    const nova = task({ title: "nova", createdAt: "2026-09-28T12:00:00Z" });
    const antiga = task({ title: "antiga", createdAt: "2026-09-27T12:00:00Z" });
    expect(order([nova, antiga])).toEqual(["antiga", "nova"]);
  });
});
