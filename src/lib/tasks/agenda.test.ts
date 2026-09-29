import { describe, expect, it } from "vitest";
import type { Task } from "@/types/task";
import { BEFORE_TODAY_LABEL, agendaDays } from "./agenda";

const TODAY = "2026-09-29"; // terça
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
    ...partial,
  };
}

describe("agendaDays", () => {
  it("agrupa por dia, em ordem, com o que já passou no topo", () => {
    const groups = agendaDays(
      [
        task({ title: "quinta", dueDate: "2026-10-01" }),
        task({ title: "passou", dueDate: "2026-09-20" }),
        task({ title: "hoje", dueDate: "2026-09-29" }),
        task({ title: "sem prazo" }),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.label)).toEqual([BEFORE_TODAY_LABEL, "Hoje", "Quinta, 1 out"]);
    expect(groups[0].tasks.map((t) => t.title)).toEqual(["passou"]);
  });

  it("ignora concluídas e arquivadas", () => {
    const groups = agendaDays(
      [task({ status: "DONE", dueDate: TODAY }), task({ status: "ARCHIVED", dueDate: TODAY })],
      TODAY,
    );
    expect(groups).toEqual([]);
  });

  it("dentro do dia, a mais importante primeiro", () => {
    const [today] = agendaDays(
      [task({ title: "baixa", dueDate: TODAY, importance: 1 }), task({ title: "alta", dueDate: TODAY, importance: 5 })],
      TODAY,
    );
    expect(today.tasks.map((t) => t.title)).toEqual(["alta", "baixa"]);
  });
});
