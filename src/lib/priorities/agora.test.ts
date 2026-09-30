import { describe, expect, it } from "vitest";
import type { Task } from "@/types/task";
import { buildAgoraView, isAgoraCandidate } from "./agora";

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
    createdAt: `2026-09-01T00:00:${String(seq).padStart(2, "0")}Z`,
    updatedAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    pausedAt: null,
    snoozedUntil: null,
    assessmentId: null,
    ...partial,
  };
}

describe("isAgoraCandidate", () => {
  it("TODO e IN_PROGRESS entram; DONE e ARCHIVED não", () => {
    expect(isAgoraCandidate(task({ status: "TODO" }), TODAY)).toBe(true);
    expect(isAgoraCandidate(task({ status: "IN_PROGRESS" }), TODAY)).toBe(true);
    expect(isAgoraCandidate(task({ status: "DONE" }), TODAY)).toBe(false);
    expect(isAgoraCandidate(task({ status: "ARCHIVED" }), TODAY)).toBe(false);
  });

  it("Inbox só entra com prazo até amanhã", () => {
    expect(isAgoraCandidate(task({ status: "INBOX" }), TODAY)).toBe(false);
    expect(isAgoraCandidate(task({ status: "INBOX", dueDate: "2026-09-29" }), TODAY)).toBe(true);
    expect(isAgoraCandidate(task({ status: "INBOX", dueDate: "2026-09-20" }), TODAY)).toBe(true);
    expect(isAgoraCandidate(task({ status: "INBOX", dueDate: "2026-09-30" }), TODAY)).toBe(false);
  });
});

describe("buildAgoraView", () => {
  it("em andamento primeiro, depois a maior nota", () => {
    const old = task({ title: "antiga" });
    const due = task({ title: "com prazo", dueDate: "2026-10-05" });
    const doing = task({ title: "fazendo", status: "IN_PROGRESS" });
    const view = buildAgoraView([old, due, doing], TODAY);
    expect(view.now?.title).toBe("fazendo");
    expect(view.now?.status).toBe("IN_PROGRESS");
    expect(view.next.map((t) => t.title)).toEqual(["com prazo", "antiga"]);
  });

  it("nunca mostra mais que 6 e conta todas as pendências abertas", () => {
    const tasks = [
      ...Array.from({ length: 9 }, () => task({})),
      task({ status: "INBOX" }),
      task({ status: "DONE" }),
    ];
    const view = buildAgoraView(tasks, TODAY);
    expect(1 + view.next.length + view.later.length).toBe(6);
    expect(view.pendingCount).toBe(10);
  });

  it("rotula cada tarefa com o contexto resolvido fora daqui", () => {
    const view = buildAgoraView([task({ projectId: "p1" }), task({})], TODAY, (t) => (t.projectId ? "CRUMB" : null));
    expect([view.now?.context, ...view.next.map((t) => t.context)]).toEqual(["CRUMB", null]);
  });

  it("vazio quando não há candidatas", () => {
    const view = buildAgoraView([task({ status: "INBOX" })], TODAY);
    expect(view.now).toBeNull();
    expect(view.pendingCount).toBe(1);
  });
});

describe("Agora não e pausada", () => {
  it("tarefa adiada sai da Agora e volta no dia marcado", () => {
    const snoozed = task({ status: "TODO", snoozedUntil: "2026-09-29" });
    expect(isAgoraCandidate(snoozed, TODAY)).toBe(false);
    expect(isAgoraCandidate(snoozed, "2026-09-29")).toBe(true);
  });

  it("pausada continua na Agora e vem marcada", () => {
    const paused = task({ status: "TODO", pausedAt: "2026-09-28T10:00:00Z" });
    const view = buildAgoraView([paused], TODAY);
    expect(view.now?.paused).toBe(true);
  });
});
