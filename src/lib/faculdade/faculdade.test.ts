import { describe, expect, it } from "vitest";
import type { Assessment } from "@/types/assessment";
import type { CalendarEvent } from "@/types/event";
import type { Area } from "@/types/project";
import type { Task } from "@/types/task";
import {
  agendaTitle,
  assessmentState,
  attentionLabel,
  doneAssessments,
  finishLabel,
  formatGrade,
  gradeLabel,
  nextAttention,
  parseGrade,
  pendingAssessments,
} from "./assessments";
import { assessmentInputSchema, assessmentPatchSchema, assessmentPatchToRow, assessmentRowSchema } from "./schemas";
import { actionsByAssessment, buildFaculdade, daysLabel, scheduleLabel, subjectSchedule } from "./summary";

// Quarta, 30 set 2026, 16:40.
const NOW = { date: "2026-09-30", time: "16:40" };
const TODAY = NOW.date;

let seq = 0;
function assessment(partial: Partial<Assessment>): Assessment {
  seq += 1;
  return {
    id: `av${seq}`,
    areaId: "mkt",
    kind: "TRABALHO",
    title: `Avaliação ${seq}`,
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

function event(partial: Partial<CalendarEvent>): CalendarEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    title: `Aula ${seq}`,
    description: null,
    location: null,
    areaId: "mkt",
    startDate: "2026-08-03",
    startTime: "19:00",
    durationMinutes: 180,
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
    createdAt: `2026-09-01T00:00:${String(seq % 60).padStart(2, "0")}Z`,
    updatedAt: "2026-09-01T00:00:00Z",
    completedAt: null,
    pausedAt: null,
    snoozedUntil: null,
    assessmentId: null,
    ...partial,
  };
}

function area(id: string, name: string, parentId: string | null, archivedAt: string | null = null, position = 0): Area {
  return { id, name, parentId, module: "FACULDADE", position, archivedAt };
}

const AREAS: Area[] = [
  area("fac", "Faculdade", null),
  area("mkt", "Marketing Digital", "fac", null, 0),
  area("est", "Estatística", "fac", null, 1),
  area("old", "Cálculo I", "fac", "2026-07-01T00:00:00Z", 2),
];

describe("estado da avaliação", () => {
  it("sem data fica aberta; no dia ainda está aberta", () => {
    expect(assessmentState(assessment({}), TODAY)).toBe("open");
    expect(assessmentState(assessment({ kind: "PROVA", dueDate: TODAY }), TODAY)).toBe("open");
  });

  it("prova passa sozinha depois do dia; trabalho e atividade ficam em 'era pra'", () => {
    expect(assessmentState(assessment({ kind: "PROVA", dueDate: "2026-09-29" }), TODAY)).toBe("done");
    expect(assessmentState(assessment({ kind: "TRABALHO", dueDate: "2026-09-29" }), TODAY)).toBe("late");
    expect(assessmentState(assessment({ kind: "ATIVIDADE", dueDate: "2026-09-29" }), TODAY)).toBe("late");
  });

  it("entregue é feita, mesmo antes da data", () => {
    expect(assessmentState(assessment({ dueDate: "2026-10-05", doneAt: "2026-09-30T10:00:00Z" }), TODAY)).toBe("done");
  });
});

describe("listas", () => {
  it("pendentes por data e horário, sem data no fim", () => {
    const list = [
      assessment({ title: "sem data" }),
      assessment({ title: "sex", dueDate: "2026-10-02" }),
      assessment({ title: "qui 19h", kind: "PROVA", dueDate: "2026-10-01", dueTime: "19:00" }),
      assessment({ title: "qui sem hora", dueDate: "2026-10-01" }),
      assessment({ title: "qui 8h", kind: "PROVA", dueDate: "2026-10-01", dueTime: "08:00" }),
      assessment({ title: "era pra ontem", kind: "ATIVIDADE", dueDate: "2026-09-29" }),
      assessment({ title: "prova passada", kind: "PROVA", dueDate: "2026-09-14" }),
      assessment({ title: "entregue", dueDate: "2026-10-03", doneAt: "2026-09-28T00:00:00Z" }),
    ];
    expect(pendingAssessments(list, TODAY).map((a) => a.title)).toEqual([
      "era pra ontem",
      "qui 8h",
      "qui 19h",
      "qui sem hora",
      "sex",
      "sem data",
    ]);
    expect(doneAssessments(list, TODAY).map((a) => a.title)).toEqual(["entregue", "prova passada"]);
  });

  it("próxima atenção: a primeira pendente com data até 7 dias", () => {
    expect(nextAttention([assessment({ dueDate: "2026-10-20" }), assessment({})], TODAY)).toBeNull();
    const prova = assessment({ kind: "PROVA", title: "AV1", dueDate: "2026-10-01", dueTime: "19:00" });
    expect(nextAttention([assessment({ dueDate: "2026-10-05" }), prova], TODAY)?.id).toBe(prova.id);
  });
});

describe("rótulos", () => {
  it("frase curta da próxima atenção, sem cobrança", () => {
    expect(attentionLabel(assessment({ kind: "PROVA", dueDate: "2026-10-01", dueTime: "19:00" }), TODAY)).toBe("Prova amanhã · 19:00");
    expect(attentionLabel(assessment({ kind: "TRABALHO", dueDate: "2026-10-02" }), TODAY)).toBe("Trabalho sexta");
    expect(attentionLabel(assessment({ kind: "ATIVIDADE", title: "Lista 3", dueDate: "2026-09-29" }), TODAY)).toBe("Lista 3 · era pra ontem");
    expect(attentionLabel(assessment({ kind: "PROVA" }), TODAY)).toBe("Prova sem data");
  });

  it("na agenda, a palavra do tipo abre o título — sem repetir", () => {
    expect(agendaTitle({ kind: "PROVA", title: "AV1" })).toBe("Prova · AV1");
    expect(agendaTitle({ kind: "TRABALHO", title: "Trabalho final" })).toBe("Entrega · Trabalho final");
    expect(agendaTitle({ kind: "PROVA", title: "Prova de Marketing" })).toBe("Prova de Marketing");
  });

  it("prova não tem botão de entrega", () => {
    expect(finishLabel("PROVA")).toBeNull();
    expect(finishLabel("TRABALHO")).toBe("Marcar como entregue");
    expect(finishLabel("ATIVIDADE")).toBe("Marcar como feita");
  });
});

describe("nota", () => {
  it("vírgula, até duas casas, sem separador de milhar", () => {
    expect(formatGrade(8.5)).toBe("8,5");
    expect(formatGrade(10)).toBe("10");
    expect(formatGrade(0.75)).toBe("0,75");
    expect(formatGrade(1000)).toBe("1000");
    expect(gradeLabel({ grade: 8.5, maxGrade: 10 })).toBe("8,5 de 10");
    expect(gradeLabel({ grade: 2, maxGrade: null })).toBe("2");
    expect(gradeLabel({ grade: null, maxGrade: 10 })).toBeNull();
  });

  it("campo de nota aceita vírgula ou ponto; vazio é sem nota; o resto é inválido", () => {
    expect(parseGrade("8,5")).toBe(8.5);
    expect(parseGrade(" 7.25 ")).toBe(7.25);
    expect(parseGrade("")).toBeNull();
    expect(parseGrade("8,555")).toBeUndefined();
    expect(parseGrade("dez")).toBeUndefined();
    expect(parseGrade("-1")).toBeUndefined();
    expect(parseGrade("1001")).toBeUndefined();
  });
});

describe("esquemas", () => {
  const areaId = "6f1c2c56-6d2b-4c83-9d4f-6f4d8f1e2a10";

  it("nova avaliação: sem data não guarda horário; campos vazios viram null", () => {
    const parsed = assessmentInputSchema.parse({
      areaId,
      kind: "PROVA",
      title: "  AV1 ",
      dueDate: null,
      dueTime: "19:00",
      location: " ",
      maxGrade: 10,
      notes: "",
    });
    expect(parsed).toMatchObject({ title: "AV1", dueTime: null, location: null, notes: null, maxGrade: 10 });
  });

  it("recusa título vazio e horário inválido", () => {
    const base = { areaId, kind: "PROVA", dueDate: "2026-10-01", location: null, maxGrade: null, notes: null };
    expect(assessmentInputSchema.safeParse({ ...base, title: " ", dueTime: null }).success).toBe(false);
    expect(assessmentInputSchema.safeParse({ ...base, title: "AV1", dueTime: "25:00" }).success).toBe(false);
  });

  it("tirar a data tira o horário junto", () => {
    expect(assessmentPatchToRow(assessmentPatchSchema.parse({ dueDate: null }))).toEqual({ due_date: null, due_time: null });
    expect(assessmentPatchToRow(assessmentPatchSchema.parse({ grade: 8.456 }))).toEqual({ grade: 8.46 });
  });

  it("linha do banco: horário curto e numeric como número", () => {
    const row = assessmentRowSchema.parse({
      id: "a",
      area_id: "b",
      kind: "PROVA",
      title: "AV1",
      due_date: "2026-10-01",
      due_time: "19:00:00",
      location: null,
      max_grade: "10.00",
      grade: 8.5,
      notes: null,
      done_at: null,
      created_at: "2026-08-01T00:00:00Z",
    });
    expect(row.dueTime).toBe("19:00");
    expect(row.maxGrade).toBe(10);
    expect(row.grade).toBe(8.5);
  });
});

describe("horários das aulas", () => {
  it("dias na ordem da semana, começando na segunda", () => {
    expect(daysLabel([3, 1])).toBe("Seg e qua");
    expect(daysLabel([5, 1, 3])).toBe("Seg, qua e sex");
    expect(daysLabel([0])).toBe("Dom");
  });

  it("só o que se repete e ainda vale; várias regras juntas", () => {
    const events = [
      event({ repeatDays: [6], startTime: "09:00" }),
      event({ repeatDays: [3, 1], startTime: "19:00" }),
      event({ repeatDays: [2], repeatUntil: "2026-06-30" }),
      event({ repeatDays: [] }),
      event({ repeatDays: [4], areaId: "est" }),
    ];
    const mine = subjectSchedule(events, new Set(["mkt"]), TODAY);
    expect(scheduleLabel(mine)).toBe("Seg e qua · 19:00 + Sáb · 09:00");
    expect(scheduleLabel([])).toBeNull();
  });
});

describe("buildFaculdade", () => {
  const assessments = [
    assessment({ id: "tf", title: "Trabalho final", areaId: "mkt", dueDate: "2026-10-05", maxGrade: 4 }),
    assessment({ id: "av1", title: "AV1", kind: "PROVA", areaId: "mkt", dueDate: "2026-09-14", grade: 8.5, maxGrade: 10 }),
    assessment({ id: "l3", title: "Lista 3", kind: "ATIVIDADE", areaId: "est", dueDate: "2026-09-29" }),
    assessment({ id: "p1", title: "P1", kind: "PROVA", areaId: "old", dueDate: "2026-10-01" }),
    assessment({ id: "av2", title: "AV2", kind: "PROVA", areaId: "mkt", dueDate: "2026-09-30", dueTime: "19:00" }),
  ];
  const events = [
    event({ title: "Aula de Marketing", areaId: "mkt", repeatDays: [1, 3], location: "Bloco C, 204" }),
    event({ title: "Aula de Estatística", areaId: "est", repeatDays: [2], startTime: "19:00" }),
    event({ title: "Aula antiga", areaId: "old", repeatDays: [4] }),
    event({ title: "Dentista", areaId: null, startDate: "2026-10-01" }),
  ];
  const tasks = [
    task({ title: "Introdução", areaId: "mkt", assessmentId: "tf" }),
    task({ title: "Slides", areaId: "mkt", assessmentId: "tf", importance: 5 }),
    task({ title: "Lista", areaId: "est", assessmentId: "l3", status: "DONE" }),
    task({ title: "Ler Kotler", areaId: "mkt" }),
  ];
  const view = buildFaculdade({ rootId: "fac", areas: AREAS, assessments, tasks, events, now: NOW });

  it("disciplinas valendo na ordem; encerradas à parte", () => {
    expect(view.subjects.map((s) => s.node.name)).toEqual(["Marketing Digital", "Estatística"]);
    expect(view.closed.map((s) => s.name)).toEqual(["Cálculo I"]);
  });

  it("card da disciplina: abertas, pendentes, notas, horário e aula hoje", () => {
    const [mkt, est] = view.subjects;
    expect(mkt.open).toBe(3);
    expect(mkt.pending.map((a) => a.title)).toEqual(["AV2", "Trabalho final"]);
    expect(mkt.grades.map((a) => a.title)).toEqual(["AV1"]);
    expect(mkt.schedule).toBe("Seg e qua · 19:00");
    expect(mkt.location).toBe("Bloco C, 204");
    expect(mkt.classToday).toBe(true);
    expect(est.classToday).toBe(false);
  });

  it("próximas avaliações: só de disciplinas valendo, por data", () => {
    expect(view.upcoming.map((a) => a.title)).toEqual(["Lista 3", "AV2", "Trabalho final"]);
  });

  it("aulas da semana: só da Faculdade (sem encerradas), com a avaliação do dia", () => {
    expect(view.week.map((o) => `${o.date} ${o.title}`)).toEqual([
      "2026-09-28 Aula de Marketing",
      "2026-09-29 Aula de Estatística",
      "2026-09-30 Aula de Marketing",
    ]);
    expect(view.week[2].flags).toEqual(["AV2"]);
    expect(view.week[0].flags).toEqual([]);
  });

  it("ações da Faculdade por prioridade; ações por avaliação só as abertas", () => {
    expect(view.actions.map((a) => a.title)).toContain("Ler Kotler");
    const byAssessment = actionsByAssessment(tasks, TODAY);
    expect(byAssessment.tf.map((a) => a.title)).toEqual(["Slides", "Introdução"]);
    expect(byAssessment.l3).toBeUndefined();
  });
});
