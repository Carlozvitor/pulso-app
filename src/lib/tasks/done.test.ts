import { describe, expect, it } from "vitest";
import type { Task } from "@/types/task";
import { groupDoneByDay } from "./done";

const TODAY = "2026-09-29";
let seq = 0;
function task(partial: Partial<Task>): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Tarefa ${seq}`,
    description: null,
    status: "DONE",
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

describe("groupDoneByDay", () => {
  it("agrupa pelo dia da conclusão, mais recente primeiro, com a hora", () => {
    const days = groupDoneByDay(
      [
        task({ title: "ontem", completedAt: "2026-09-28T15:00:00Z" }),
        task({ title: "hoje cedo", completedAt: "2026-09-29T11:05:00Z" }),
        task({ title: "hoje tarde", completedAt: "2026-09-29T17:30:00Z" }),
      ],
      TODAY,
    );
    expect(days.map((d) => d.label)).toEqual(["Hoje", "Ontem"]);
    expect(days[0].tasks.map((t) => [t.title, t.time])).toEqual([
      ["hoje tarde", "14:30"],
      ["hoje cedo", "08:05"],
    ]);
  });

  it("usa o fuso de Fortaleza: 01:00 UTC ainda é o dia anterior", () => {
    const [day] = groupDoneByDay([task({ completedAt: "2026-09-29T01:00:00Z" })], TODAY);
    expect(day.key).toBe("2026-09-28");
    expect(day.label).toBe("Ontem");
  });

  it("ignora o que não está concluído ou não tem data de conclusão", () => {
    const days = groupDoneByDay(
      [task({ status: "TODO", completedAt: "2026-09-29T12:00:00Z" }), task({ completedAt: null })],
      TODAY,
    );
    expect(days).toEqual([]);
  });
});
