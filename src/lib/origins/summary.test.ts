import { describe, expect, it } from "vitest";
import type { Area } from "@/types/project";
import type { Task } from "@/types/task";
import { doneRecently, openCounts, originActions, summarizeFronts } from "./summary";

const TODAY = "2026-09-29";

function area(id: string, name: string, parentId: string | null, position = 0): Area {
  return { id, name, parentId, module: "TRABALHO", position, archivedAt: null };
}

const AREAS: Area[] = [
  area("tra", "Trabalho", null),
  area("val", "Valentine", "tra", 0),
  area("con", "Conteúdo", "val", 0),
  area("ins", "Instagram", "con", 0),
  area("adm", "Administrativo", "val", 1),
  area("cli", "Clientes / Freelance", "tra", 1),
];

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

describe("openCounts", () => {
  it("soma as abertas do item e de tudo abaixo", () => {
    const counts = openCounts(AREAS, [
      task({ areaId: "ins" }),
      task({ areaId: "con" }),
      task({ areaId: "adm", status: "IN_PROGRESS" }),
      task({ areaId: "adm", status: "DONE" }),
      task({ areaId: "cli", status: "ARCHIVED" }),
    ]);
    expect(counts.get("ins")).toBe(1);
    expect(counts.get("con")).toBe(2);
    expect(counts.get("val")).toBe(3);
    expect(counts.get("tra")).toBe(3);
    expect(counts.get("cli")).toBe(0);
  });
});

describe("summarizeFronts", () => {
  it("frentes na ordem, com subitens e a próxima ação pela prioridade", () => {
    const fronts = summarizeFronts("tra", AREAS, [
      task({ title: "baixa", areaId: "ins", importance: 1 }),
      task({ title: "alta", areaId: "adm", importance: 5 }),
    ], TODAY);
    expect(fronts.map((f) => f.node.name)).toEqual(["Valentine", "Clientes / Freelance"]);
    expect(fronts[0].subs.map((s) => [s.node.name, s.open])).toEqual([
      ["Conteúdo", 1],
      ["Administrativo", 1],
    ]);
    expect(fronts[0].next?.title).toBe("alta");
    expect(fronts[1].next).toBeNull();
  });

  it("'Agora não' não vira próxima ação", () => {
    const [valentine] = summarizeFronts("tra", AREAS, [task({ areaId: "con", snoozedUntil: "2026-09-30" })], TODAY);
    expect(valentine.open).toBe(1);
    expect(valentine.next).toBeNull();
  });
});

describe("originActions", () => {
  it("abertas do item e dos subitens; em andamento no topo", () => {
    const list = originActions("con", AREAS, [
      task({ title: "instagram", areaId: "ins", importance: 5 }),
      task({ title: "andamento", areaId: "con", status: "IN_PROGRESS" }),
      task({ title: "outra frente", areaId: "adm" }),
      task({ title: "feita", areaId: "con", status: "DONE" }),
    ], TODAY);
    expect(list.map((t) => t.title)).toEqual(["andamento", "instagram"]);
    expect(list[0].status).toBe("IN_PROGRESS");
  });
});

describe("doneRecently", () => {
  it("conta concluídas nos últimos 7 dias, neste item e abaixo", () => {
    const n = doneRecently("val", AREAS, [
      task({ areaId: "ins", status: "DONE", completedAt: "2026-09-29T15:00:00Z" }),
      task({ areaId: "con", status: "DONE", completedAt: "2026-09-23T15:00:00Z" }),
      task({ areaId: "con", status: "DONE", completedAt: "2026-09-22T15:00:00Z" }),
      task({ areaId: "cli", status: "DONE", completedAt: "2026-09-29T15:00:00Z" }),
    ], TODAY);
    expect(n).toBe(2);
  });
});
