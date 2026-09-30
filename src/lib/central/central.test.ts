import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/types/event";
import type { ProjectSummary } from "@/types/project";
import type { Task } from "@/types/task";
import { CENTRAL_LIMITS, buildCentral } from "./central";

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

function project(partial: Partial<ProjectSummary>): ProjectSummary {
  seq += 1;
  return {
    id: `p${seq}`,
    name: `Projeto ${seq}`,
    description: null,
    status: "ACTIVE",
    areaId: null,
    dueDate: null,
    createdAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    progress: { done: 1, total: 2, percent: 50 },
    ...partial,
  };
}

const titles = (list: { items: { title: string }[] }) => list.items.map((i) => i.title);

describe("buildCentral", () => {
  it("Agora mostra a próxima ação e no máximo 2 depois", () => {
    const view = buildCentral([task({}), task({}), task({}), task({}), task({})], [], TODAY);
    expect(view.now).not.toBeNull();
    expect(view.next).toHaveLength(CENTRAL_LIMITS.next);
    expect(view.pendingCount).toBe(5);
  });

  it("Hoje junta o prazo de hoje e o que já passou, mais cedo primeiro", () => {
    const view = buildCentral(
      [
        task({ title: "hoje", dueDate: TODAY }),
        task({ title: "passou", dueDate: "2026-09-25" }),
        task({ title: "amanhã", dueDate: "2026-09-30" }),
      ],
      [],
      TODAY,
    );
    expect(titles(view.todayList)).toEqual(["passou", "hoje"]);
    expect(titles(view.upcoming)).toEqual(["amanhã"]);
  });

  it("Próximas atenções vai até 7 dias e ignora o que está mais longe", () => {
    const view = buildCentral(
      [
        task({ title: "em 7 dias", dueDate: "2026-10-06" }),
        task({ title: "em 8 dias", dueDate: "2026-10-07" }),
      ],
      [],
      TODAY,
    );
    expect(titles(view.upcoming)).toEqual(["em 7 dias"]);
  });

  it("prazo de projeto ativo entra; concluído e sem prazo não", () => {
    const view = buildCentral(
      [task({ title: "tarefa amanhã", dueDate: "2026-09-30" })],
      [
        project({ name: "PORTFÓLIO", dueDate: "2026-09-30" }),
        project({ name: "feito", dueDate: "2026-09-30", status: "DONE" }),
        project({ name: "sem prazo" }),
      ],
      TODAY,
    );
    // No mesmo dia, tarefa antes de projeto.
    expect(view.upcoming.items.map((i) => [i.kind, i.title])).toEqual([
      ["task", "tarefa amanhã"],
      ["project", "PORTFÓLIO"],
    ]);
  });

  it("só tarefas abertas contam; concluídas e arquivadas ficam de fora", () => {
    const view = buildCentral(
      [
        task({ title: "feita", dueDate: TODAY, status: "DONE" }),
        task({ title: "arquivada", dueDate: TODAY, status: "ARCHIVED" }),
        task({ title: "inbox", dueDate: TODAY, status: "INBOX" }),
      ],
      [],
      TODAY,
    );
    expect(titles(view.todayList)).toEqual(["inbox"]);
  });

  it("no mesmo dia, tarefas seguem a prioridade", () => {
    const view = buildCentral(
      [task({ title: "baixa", dueDate: TODAY, importance: 1 }), task({ title: "alta", dueDate: TODAY, importance: 5 })],
      [],
      TODAY,
    );
    expect(titles(view.todayList)).toEqual(["alta", "baixa"]);
  });

  it("corta no limite e conta o que sobrou", () => {
    const many = Array.from({ length: CENTRAL_LIMITS.today + 3 }, () => task({ dueDate: TODAY }));
    const view = buildCentral(many, [], TODAY);
    expect(view.todayList.items).toHaveLength(CENTRAL_LIMITS.today);
    expect(view.todayList.more).toBe(3);
  });

  it("usa o rótulo de contexto de cada tarefa", () => {
    const view = buildCentral([task({ dueDate: TODAY, areaId: "a1" })], [], TODAY, (t) => (t.areaId ? "Faculdade" : null));
    const [item] = view.todayList.items;
    expect(item.kind === "task" && item.context).toBe("Faculdade");
  });
});

describe("buildCentral com compromissos", () => {
  const now = { date: TODAY, time: "15:00" };
  const ev = (partial: Partial<CalendarEvent>): CalendarEvent => ({
    id: `e${(seq += 1)}`,
    title: "Compromisso",
    description: null,
    location: null,
    areaId: null,
    startDate: TODAY,
    startTime: "10:00",
    durationMinutes: 60,
    repeatDays: [],
    repeatUntil: null,
    skippedDates: [],
    ...partial,
  });

  it("Hoje: só os compromissos que ainda não passaram, por horário", () => {
    const view = buildCentral([], [], TODAY, undefined, {
      now,
      events: [ev({ title: "19h", startTime: "19:00" }), ev({ title: "manhã", startTime: "08:00" }), ev({ title: "16h", startTime: "16:00" })],
    });
    expect(view.todayEvents.map((o) => o.title)).toEqual(["16h", "19h"]);
    expect(view.todayList.items).toEqual([]);
  });

  it("Próximas atenções: compromisso avulso entra antes das tarefas do mesmo dia; rotina que se repete não", () => {
    const view = buildCentral([task({ title: "tarefa", dueDate: "2026-09-30" })], [], TODAY, undefined, {
      now,
      events: [
        ev({ title: "dentista", startDate: "2026-09-30", startTime: "09:00", location: "Aldeota" }),
        ev({ title: "academia", startDate: "2026-09-28", repeatDays: [1, 3, 5] }),
      ],
    });
    expect(view.upcoming.items.map((i) => [i.kind, i.title])).toEqual([
      ["event", "dentista"],
      ["task", "tarefa"],
    ]);
    const [first] = view.upcoming.items;
    expect(first.kind === "event" && first.context).toBe("Aldeota");
  });
});
