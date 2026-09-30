import { describe, expect, it } from "vitest";
import type { Task } from "@/types/task";
import { todoSections } from "./todo";

const TODAY = "2026-09-29";
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
    createdAt: `2026-09-01T00:00:${String(seq).padStart(2, "0")}Z`,
    updatedAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    pausedAt: null,
    snoozedUntil: null,
    assessmentId: null,
    ...partial,
  };
}

describe("todoSections", () => {
  it("separa em andamento, pausadas, a fazer e para depois", () => {
    const s = todoSections(
      [
        task({ title: "fazendo", status: "IN_PROGRESS" }),
        task({ title: "pausada", pausedAt: "2026-09-29T10:00:00Z" }),
        task({ title: "normal" }),
        task({ title: "amanhã", snoozedUntil: "2026-09-30" }),
        task({ title: "inbox", status: "INBOX" }),
        task({ title: "feita", status: "DONE" }),
      ],
      TODAY,
    );
    expect(s.inProgress.map((t) => t.title)).toEqual(["fazendo"]);
    expect(s.paused.map((t) => t.title)).toEqual(["pausada"]);
    expect(s.todo.map((t) => t.title)).toEqual(["normal"]);
    expect(s.later.map((t) => [t.title, t.snoozedUntil])).toEqual([["amanhã", "2026-09-30"]]);
  });

  it("adiamento vencido volta para A fazer", () => {
    const s = todoSections([task({ title: "voltou", snoozedUntil: TODAY })], TODAY);
    expect(s.todo.map((t) => t.title)).toEqual(["voltou"]);
    expect(s.later).toEqual([]);
  });

  it("dentro do bloco, a mais importante primeiro", () => {
    const s = todoSections([task({ title: "baixa", importance: 1 }), task({ title: "alta", importance: 5 })], TODAY);
    expect(s.todo.map((t) => t.title)).toEqual(["alta", "baixa"]);
  });
});
