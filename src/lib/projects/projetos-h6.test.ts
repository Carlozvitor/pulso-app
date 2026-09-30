import { describe, expect, it } from "vitest";
import type { Area, Project } from "@/types/project";
import type { Task } from "@/types/task";
import { actionsCount, projectDue, projectDueTitle, projectSince } from "./labels";
import { nextProjectAction, splitProjects, summarizeProjects, withoutPausedProjects } from "./organize";
import { createProjectSchema } from "./schemas";

const TODAY = "2026-10-01"; // quinta

let seq = 0;
function project(partial: Partial<Project>): Project {
  seq += 1;
  return {
    id: `p${seq}`,
    name: `Projeto ${seq}`,
    description: null,
    status: "ACTIVE",
    areaId: null,
    dueDate: null,
    createdAt: "2026-09-01T12:00:00Z",
    completedAt: null,
    pausedAt: null,
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
    createdAt: `2026-09-20T12:00:${String(seq % 60).padStart(2, "0")}Z`,
    updatedAt: "2026-09-30T12:00:00Z",
    completedAt: null,
    pausedAt: null,
    snoozedUntil: null,
    assessmentId: null,
    ...partial,
  };
}

const areas: Area[] = [
  { id: "a-trab", name: "Trabalho", parentId: null, module: "TRABALHO", position: 0, archivedAt: null },
  { id: "a-free", name: "Clientes / Freelance", parentId: "a-trab", module: "TRABALHO", position: 1, archivedAt: null },
  { id: "a-vida", name: "Vida pessoal", parentId: null, module: "VIDA_PESSOAL", position: 0, archivedAt: null },
];

describe("withoutPausedProjects", () => {
  it("tira só as ações dos projetos pausados", () => {
    const loose = task({});
    const running = task({ projectId: "p-run" });
    const sleeping = task({ projectId: "p-pause" });
    expect(withoutPausedProjects([loose, running, sleeping], new Set(["p-pause"]))).toEqual([loose, running]);
  });

  it("sem pausados, devolve a mesma lista", () => {
    const list = [task({ projectId: "p1" })];
    expect(withoutPausedProjects(list, new Set())).toBe(list);
  });
});

describe("nextProjectAction", () => {
  it("em andamento vem primeiro, como na Agora", () => {
    const urgent = task({ dueDate: TODAY, importance: 5 });
    const doing = task({ status: "IN_PROGRESS" });
    expect(nextProjectAction([urgent, doing], TODAY)?.id).toBe(doing.id);
  });

  it("ignora o que está em 'Agora não' e a Inbox sem prazo perto", () => {
    const snoozed = task({ snoozedUntil: "2026-10-05", importance: 5 });
    const inbox = task({ status: "INBOX" });
    const plain = task({});
    expect(nextProjectAction([snoozed, inbox, plain], TODAY)?.id).toBe(plain.id);
    expect(nextProjectAction([snoozed, inbox], TODAY)).toBeNull();
  });
});

describe("summarizeProjects", () => {
  it("progresso sem arquivadas, caminho da origem e a próxima ação", () => {
    const p = project({ areaId: "a-free" });
    const tasks = [
      task({ projectId: p.id, status: "DONE" }),
      task({ projectId: p.id, status: "ARCHIVED" }),
      task({ projectId: p.id, title: "Montar página do blog" }),
      task({ title: "Outra coisa" }),
    ];
    const [summary] = summarizeProjects([p], tasks, areas, TODAY);
    expect(summary.progress).toEqual({ done: 1, total: 2, percent: 50 });
    expect(summary.origin).toBe("Trabalho → Clientes / Freelance");
    expect(summary.originModule).toBe("TRABALHO");
    expect(summary.next?.title).toBe("Montar página do blog");
  });

  it("pausado não tem próxima ação; sem origem fica null", () => {
    const p = project({ status: "PAUSED", pausedAt: "2026-09-12T12:00:00Z" });
    const [summary] = summarizeProjects([p], [task({ projectId: p.id })], areas, TODAY);
    expect(summary.next).toBeNull();
    expect(summary.origin).toBeNull();
    expect(summary.originModule).toBeNull();
    expect(summary.progress.total).toBe(1);
  });

  it("origem que não existe mais vira 'sem origem'", () => {
    const [summary] = summarizeProjects([project({ areaId: "apagada" })], [], areas, TODAY);
    expect(summary.origin).toBeNull();
  });
});

describe("splitProjects", () => {
  it("separa pelas abas, cada uma na sua ordem", () => {
    const later = project({ name: "B", dueDate: "2026-10-31" });
    const sooner = project({ name: "C", dueDate: "2026-10-15" });
    const noDue = project({ name: "A" });
    const oldPause = project({ status: "PAUSED", pausedAt: "2026-09-01T12:00:00Z" });
    const newPause = project({ status: "PAUSED", pausedAt: "2026-09-20T12:00:00Z" });
    const doneOld = project({ status: "DONE", completedAt: "2026-08-01T12:00:00Z" });
    const doneNew = project({ status: "DONE", completedAt: "2026-09-25T12:00:00Z" });
    const archived = project({ status: "ARCHIVED", completedAt: "2026-09-02T12:00:00Z" });

    const lists = splitProjects([noDue, later, doneOld, oldPause, sooner, archived, newPause, doneNew]);
    expect(lists.active.map((p) => p.id)).toEqual([sooner.id, later.id, noDue.id]);
    expect(lists.paused.map((p) => p.id)).toEqual([newPause.id, oldPause.id]);
    expect(lists.done.map((p) => p.id)).toEqual([doneNew.id, doneOld.id]);
    expect(lists.archived.map((p) => p.id)).toEqual([archived.id]);
  });
});

describe("rótulos do projeto", () => {
  it("prazo no card: sem cobrança para o que passou", () => {
    expect(projectDue(null, TODAY)).toEqual({ label: "sem prazo", note: null, soon: false });
    expect(projectDue("2026-09-28", TODAY)).toEqual({ label: "Era pra 28 set", note: null, soon: false });
    expect(projectDue(TODAY, TODAY)).toEqual({ label: "prazo qui, 1 out", note: "hoje", soon: true });
    expect(projectDue("2026-10-02", TODAY)).toEqual({ label: "prazo sex, 2 out", note: "amanhã", soon: true });
    expect(projectDue("2026-10-15", TODAY)).toEqual({ label: "prazo qui, 15 out", note: "em 14 dias", soon: true });
    expect(projectDue("2026-10-31", TODAY).soon).toBe(false);
  });

  it("prazo grande na página", () => {
    expect(projectDueTitle("2026-10-15", TODAY)).toEqual({ title: "Quinta, 15 out", note: "em 14 dias" });
    expect(projectDueTitle(TODAY, TODAY)).toEqual({ title: "Hoje", note: "é hoje" });
    expect(projectDueTitle("2026-09-28", TODAY)).toEqual({ title: "Segunda, 28 set", note: "já passou" });
  });

  it("desde quando, conforme o status", () => {
    expect(projectSince(project({ status: "PAUSED", pausedAt: "2026-09-12T15:00:00Z" }))).toBe("Pausado desde 12 set");
    expect(projectSince(project({ status: "DONE", completedAt: "2026-10-03T15:00:00Z" }))).toBe("Concluído em 3 out");
    expect(projectSince(project({ status: "ARCHIVED", completedAt: "2026-10-03T15:00:00Z" }))).toBe("Arquivado em 3 out");
    expect(projectSince(project({ createdAt: "2026-09-03T15:00:00Z" }))).toBe("desde 3 set");
  });

  it("contagem de ações", () => {
    expect(actionsCount(0, 0)).toBe("Nenhuma ação ainda");
    expect(actionsCount(5, 12)).toBe("5 de 12 ações");
    expect(actionsCount(0, 1)).toBe("0 de 1 ação");
  });
});

describe("createProjectSchema (objetivo)", () => {
  it("objetivo é opcional e vazio vira null", () => {
    expect(createProjectSchema.parse({ name: "X", areaId: null, dueDate: null }).description).toBeUndefined();
    expect(createProjectSchema.parse({ name: "X", areaId: null, dueDate: null, description: "  " }).description).toBeNull();
    expect(createProjectSchema.parse({ name: "X", areaId: null, dueDate: null, description: " Lançar " }).description).toBe("Lançar");
  });
});
