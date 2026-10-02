import { describe, expect, it } from "vitest";
import type { WorkoutData, WorkoutEntry, WorkoutExercise, WorkoutPlan, WorkoutSession } from "@/types/workout";
import { compareValues, formatNumber, formatValues, parseNumber, valuesFor } from "./format";
import { entryPatchSchema, exerciseRowSchema, exerciseTargetSchema, startSchema } from "./schemas";
import {
  bestRecord,
  chartModel,
  evolution,
  frequency,
  goalProgress,
  lastBefore,
  namesLabel,
  navLabel,
  nextPlan,
  niceStep,
  recordsByExercise,
  suggestPlanName,
  summarizeExercise,
  summarizeSession,
  trainedDates,
  weekCountLabel,
} from "./summary";

// Quinta, 1 out 2026.
const TODAY = "2026-10-01";

let seq = 0;
const id = (prefix: string) => `${prefix}${++seq}`;

function exercise(partial: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return { id: id("x"), name: `Exercício ${seq}`, kind: "LOAD", goal: null, archivedAt: null, createdAt: "2026-08-01T00:00:00Z", ...partial };
}

function session(date: string, partial: Partial<WorkoutSession> = {}): WorkoutSession {
  return { id: id("s"), date, planId: null, startedAt: `${date}T23:00:00Z`, finishedAt: `${date}T23:59:00Z`, ...partial };
}

function entry(s: WorkoutSession, x: WorkoutExercise, partial: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    id: id("e"),
    sessionId: s.id,
    exerciseId: x.id,
    position: 0,
    sets: null,
    reps: null,
    loadKg: null,
    minutes: null,
    done: true,
    createdAt: s.startedAt,
    ...partial,
  };
}

function data(partial: Partial<WorkoutData> = {}): WorkoutData {
  return { exercises: [], plans: [], planItems: [], sessions: [], entries: [], weeklyGoal: null, ...partial };
}

function plan(name: string, position: number): WorkoutPlan {
  return { id: id("p"), name, position, createdAt: "2026-09-01T00:00:00Z" };
}

describe("números", () => {
  it("formata no jeito brasileiro, sem zeros sobrando", () => {
    expect(formatNumber(40)).toBe("40");
    expect(formatNumber(42.5)).toBe("42,5");
    expect(formatNumber(22.25)).toBe("22,25");
    expect(formatNumber(1200)).toBe("1200");
  });

  it("lê vírgula ou ponto; vazio é null; texto é inválido", () => {
    expect(parseNumber("42,5")).toBe(42.5);
    expect(parseNumber(" 40 ")).toBe(40);
    expect(parseNumber("42.5")).toBe(42.5);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("4x")).toBeUndefined();
    expect(parseNumber("-3")).toBeUndefined();
  });

  it("uma linha por tipo", () => {
    const v = { sets: 4, reps: 10, loadKg: 40, minutes: null };
    expect(formatValues("LOAD", v)).toBe("4×10 · 40 kg");
    expect(formatValues("LOAD", { ...v, loadKg: 42.5 })).toBe("4×10 · 42,5 kg");
    expect(formatValues("LOAD", { ...v, sets: null, reps: null })).toBe("40 kg");
    expect(formatValues("LOAD", { ...v, loadKg: null })).toBe("4×10");
    expect(formatValues("BODYWEIGHT", { ...v, loadKg: 40 })).toBe("4×10");
    expect(formatValues("BODYWEIGHT", { sets: 3, reps: null, loadKg: null, minutes: null })).toBe("3 séries");
    expect(formatValues("BODYWEIGHT", { sets: 1, reps: null, loadKg: null, minutes: null })).toBe("1 série");
    expect(formatValues("TIME", { sets: null, reps: null, loadKg: null, minutes: 25 })).toBe("25 min");
    expect(formatValues("TIME", { sets: null, reps: null, loadKg: null, minutes: null })).toBe("–");
  });

  it("guarda só os números que o tipo usa", () => {
    const v = { sets: 4, reps: 10, loadKg: 40, minutes: 20 };
    expect(valuesFor("TIME", v)).toEqual({ sets: null, reps: null, loadKg: null, minutes: 20 });
    expect(valuesFor("BODYWEIGHT", v)).toEqual({ sets: 4, reps: 10, loadKg: null, minutes: null });
    expect(valuesFor("LOAD", v)).toEqual({ sets: 4, reps: 10, loadKg: 40, minutes: null });
  });
});

describe("comparar com a última vez", () => {
  const base = { sets: 4, reps: 8, loadKg: 50, minutes: null };

  it("na carga, o peso vale primeiro", () => {
    expect(compareValues("LOAD", base, { ...base, loadKg: 55 })).toEqual({ label: "+5 kg", direction: "up" });
    expect(compareValues("LOAD", base, { ...base, loadKg: 47.5 })).toEqual({ label: "−2,5 kg", direction: "down" });
  });

  it("mesmo peso: repetições, depois séries", () => {
    expect(compareValues("LOAD", base, { ...base, reps: 10 })).toEqual({ label: "+2 rep.", direction: "up" });
    expect(compareValues("LOAD", base, { ...base, sets: 5 })).toEqual({ label: "+1 série", direction: "up" });
    expect(compareValues("LOAD", base, { ...base, sets: 2 })).toEqual({ label: "−2 séries", direction: "down" });
    expect(compareValues("LOAD", base, base)).toEqual({ label: "igual", direction: "same" });
  });

  it("peso do corpo ignora carga; tempo usa minutos", () => {
    expect(compareValues("BODYWEIGHT", base, { ...base, loadKg: 90, reps: 15 })).toEqual({ label: "+7 rep.", direction: "up" });
    expect(compareValues("TIME", { ...base, minutes: 10 }, { ...base, minutes: 25 })).toEqual({ label: "+15 min", direction: "up" });
  });

  it("sem número de um lado, passa para o próximo", () => {
    expect(compareValues("LOAD", { ...base, loadKg: null }, { ...base, reps: 10 })).toEqual({ label: "+2 rep.", direction: "up" });
  });
});

describe("registros e evolução", () => {
  const supino = exercise({ name: "Supino reto", goal: 60 });
  const flexao = exercise({ name: "Flexão", kind: "BODYWEIGHT" });
  const nunca = exercise({ name: "Abdominal" });
  const guardado = exercise({ name: "Remada", archivedAt: "2026-09-20T00:00:00Z" });
  const s1 = session("2026-08-12");
  const s2 = session("2026-09-24");
  const s3 = session("2026-09-30");
  const aberto = session(TODAY, { finishedAt: null });
  const d = data({
    exercises: [supino, flexao, nunca, guardado],
    sessions: [s3, s1, aberto, s2],
    entries: [
      entry(s1, supino, { sets: 4, reps: 10, loadKg: 30 }),
      entry(s2, supino, { sets: 3, reps: 6, loadKg: 45 }),
      entry(s3, supino, { sets: 4, reps: 10, loadKg: 40 }),
      entry(s3, flexao, { sets: 3, reps: 15 }),
      entry(aberto, supino, { sets: 4, reps: 10, loadKg: 40, done: false }),
      entry(s1, guardado, { sets: 3, reps: 12, loadKg: 40 }),
    ],
  });
  const records = recordsByExercise(d);

  it("só os feitos, do mais antigo ao mais novo", () => {
    expect(records.get(supino.id)?.map((r) => r.session.date)).toEqual(["2026-08-12", "2026-09-24", "2026-09-30"]);
  });

  it("a última vez antes de um treino não conta ele mesmo", () => {
    const list = records.get(supino.id) ?? [];
    expect(lastBefore(list)?.session.id).toBe(s3.id);
    expect(lastBefore(list, aberto)?.session.id).toBe(s3.id);
    expect(lastBefore(list, s3)?.session.id).toBe(s2.id);
    expect(lastBefore(list, s1)).toBeNull();
  });

  it("no mesmo dia, vale a hora em que começou", () => {
    const x = exercise();
    const manha = session("2026-09-29", { startedAt: "2026-09-29T10:00:00Z" });
    const noite = session("2026-09-29", { startedAt: "2026-09-29T22:00:00Z" });
    const r = recordsByExercise(
      data({ exercises: [x], sessions: [noite, manha], entries: [entry(noite, x, { loadKg: 20 }), entry(manha, x, { loadKg: 10 })] }),
    ).get(x.id)!;
    expect(r.map((x) => x.entry.loadKg)).toEqual([10, 20]);
    expect(lastBefore(r, noite)?.entry.loadKg).toBe(10);
  });

  it("melhor marca: maior carga; empate, mais repetições", () => {
    expect(bestRecord(supino, records.get(supino.id) ?? [])?.session.id).toBe(s2.id);
    const x = exercise();
    const a = session("2026-09-01");
    const b = session("2026-09-02");
    const list = recordsByExercise(
      data({ exercises: [x], sessions: [a, b], entries: [entry(a, x, { reps: 8, loadKg: 40 }), entry(b, x, { reps: 10, loadKg: 40 })] }),
    ).get(x.id)!;
    expect(bestRecord(x, list)?.session.id).toBe(b.id);
  });

  it("resumo: primeiro, último, mudança e meta (pela última vez)", () => {
    const summary = summarizeExercise(supino, records.get(supino.id) ?? []);
    expect(summary.count).toBe(3);
    expect(summary.first?.entry.loadKg).toBe(30);
    expect(summary.last?.entry.loadKg).toBe(40);
    expect(summary.change).toEqual({ label: "+10 kg", direction: "up" });
    expect(summary.goal).toEqual({ current: 40, target: 60, percent: 67, reached: false });
    expect(summarizeExercise(flexao, records.get(flexao.id) ?? []).change).toBeNull();
  });

  it("meta alcançada não passa de 100%", () => {
    const list = records.get(supino.id) ?? [];
    expect(goalProgress({ ...supino, goal: 35 }, list.at(-1) ?? null)).toEqual({ current: 40, target: 35, percent: 100, reached: true });
    expect(goalProgress({ ...supino, goal: 50 }, null)).toEqual({ current: null, target: 50, percent: 0, reached: false });
    expect(goalProgress({ ...supino, goal: null }, null)).toBeNull();
  });

  it("evolução: feitos mais recentes primeiro, nunca feitos no fim, sem guardados", () => {
    expect(evolution(d).map((s) => s.exercise.name)).toEqual(["Flexão", "Supino reto", "Abdominal"]);
  });
});

describe("treinos", () => {
  const supino = exercise({ name: "Supino reto" });
  const cruci = exercise({ name: "Crucifixo" });
  const triceps = exercise({ name: "Tríceps corda" });
  const flexao = exercise({ name: "Flexão", kind: "BODYWEIGHT" });
  const esteira = exercise({ name: "Esteira", kind: "TIME" });
  const antes = session("2026-09-24");
  const depois = session("2026-09-30");
  const d = data({
    exercises: [supino, cruci, triceps, flexao, esteira],
    sessions: [antes, depois],
    entries: [
      entry(antes, supino, { sets: 4, reps: 10, loadKg: 35 }),
      entry(antes, flexao, { sets: 3, reps: 12 }),
      entry(depois, supino, { position: 0, sets: 4, reps: 10, loadKg: 40 }),
      entry(depois, cruci, { position: 1, sets: 3, reps: 12, loadKg: 14 }),
      entry(depois, triceps, { position: 2, sets: 3, reps: 12, loadKg: 25 }),
      entry(depois, flexao, { position: 3, sets: 3, reps: 15 }),
      entry(depois, esteira, { position: 4, minutes: 20 }),
    ],
  });

  it("sem ficha, o título são os exercícios; conta os que subiram", () => {
    const summary = summarizeSession(depois, d);
    expect(summary.title).toBe("Supino reto, Crucifixo, Tríceps corda +2");
    expect(summary.names).toBe("");
    expect(summary.done).toBe(5);
    expect(summary.ups).toBe(2);
  });

  it("com ficha, o título é a ficha e os exercícios vão embaixo", () => {
    const a = plan("Treino A", 0);
    const s = { ...depois, planId: a.id };
    const summary = summarizeSession(s, { ...d, plans: [a], sessions: [antes, s] });
    expect(summary.title).toBe("Treino A");
    expect(summary.names).toBe("Supino reto, Crucifixo, Tríceps corda +2");
  });

  it("treino vazio", () => {
    const vazio = session(TODAY, { finishedAt: null });
    expect(summarizeSession(vazio, { ...d, sessions: [...d.sessions, vazio] }).title).toBe("Treino sem exercícios");
  });

  it("nomes: até 3 e o resto em número", () => {
    expect(namesLabel(["A", "B"])).toBe("A, B");
    expect(namesLabel(["A", "B", "C", "D"])).toBe("A, B, C +1");
  });
});

describe("fichas", () => {
  const a = plan("Treino A", 0);
  const b = plan("Treino B", 1);
  const c = plan("Treino C", 2);

  it("sem ficha usada, a primeira é a da vez", () => {
    expect(nextPlan(data({ plans: [c, a, b] }))?.id).toBe(a.id);
    expect(nextPlan(data())).toBeNull();
  });

  it("rodízio: a depois da última usada, voltando ao começo", () => {
    expect(nextPlan(data({ plans: [a, b, c], sessions: [session("2026-09-28", { planId: a.id })] }))?.id).toBe(b.id);
    const sessions = [session("2026-09-28", { planId: b.id }), session("2026-09-30", { planId: c.id }), session("2026-09-29")];
    expect(nextPlan(data({ plans: [a, b, c], sessions }))?.id).toBe(a.id);
  });

  it("ficha apagada não conta", () => {
    expect(nextPlan(data({ plans: [a, b], sessions: [session("2026-09-30", { planId: "apagada" })] }))?.id).toBe(a.id);
  });

  it("nome sugerido: a primeira letra livre", () => {
    expect(suggestPlanName([])).toBe("Treino A");
    expect(suggestPlanName([a, c])).toBe("Treino B");
    expect(suggestPlanName([{ ...a, name: "treino a" }])).toBe("Treino B");
  });
});

describe("frequência", () => {
  const x = exercise();
  // Semana de 28 set (seg) a 4 out (dom).
  const seg = session("2026-09-28");
  const qua = session("2026-09-30");
  const semFeito = session("2026-09-29");
  const passada = session("2026-09-24");
  const d = data({
    exercises: [x],
    sessions: [seg, qua, semFeito, passada],
    entries: [entry(seg, x), entry(qua, x), entry(semFeito, x, { done: false }), entry(passada, x)],
    weeklyGoal: 4,
  });

  it("dia conta só com exercício feito", () => {
    expect([...trainedDates(d)].sort()).toEqual(["2026-09-24", "2026-09-28", "2026-09-30"]);
  });

  it("esta semana, de segunda a domingo", () => {
    const f = frequency(d, TODAY);
    expect(f.current.start).toBe("2026-09-28");
    expect(f.current.count).toBe(2);
    expect(f.current.days.map((d) => d.label)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
    expect(f.current.days.map((d) => d.trained)).toEqual([true, false, true, false, false, false, false]);
    expect(f.current.days[3]).toMatchObject({ today: true, future: false });
    expect(f.current.days[4]).toMatchObject({ today: false, future: true });
    expect(f.weeks).toHaveLength(8);
    expect(f.weeks[6]).toMatchObject({ start: "2026-09-21", count: 1, hit: false });
  });

  it("média só das semanas completas desde a primeira com treino", () => {
    expect(frequency(d, TODAY).average).toBeNull();
    const mais = data({ ...d, sessions: [...d.sessions, session("2026-09-15"), session("2026-09-17")] });
    mais.entries = [...d.entries, ...mais.sessions.slice(4).map((s) => entry(s, x))];
    // semanas de 14 set (2) e 21 set (1): média 1,5
    expect(frequency(mais, TODAY).average).toBe(1.5);
  });

  it("rótulos sem cobrança", () => {
    const f = frequency(d, TODAY);
    expect(weekCountLabel(2, 4)).toBe("2 de 4");
    expect(weekCountLabel(0, null)).toBe("Nenhum");
    expect(weekCountLabel(1, null)).toBe("1 treino");
    expect(navLabel(f, false)).toBe("2 de 4 na semana");
    expect(navLabel(f, true)).toBe("Treino em andamento");
    expect(navLabel(frequency(data({ weeklyGoal: 3 }), TODAY), false)).toBe("Meta: 3 na semana");
    expect(navLabel(frequency(data(), TODAY), false)).toBe("Nada registrado na semana");
  });
});

describe("gráfico", () => {
  it("passo redondo", () => {
    expect(niceStep(15)).toBe(5);
    expect(niceStep(2)).toBe(1);
    expect(niceStep(7, true)).toBe(2);
    expect(niceStep(40)).toBe(10);
  });

  it("pontos na escala: x pelo dia, y pelo número", () => {
    const x = exercise();
    const a = session("2026-08-12");
    const b = session("2026-09-01");
    const c = session("2026-09-30");
    const d = data({
      exercises: [x],
      sessions: [a, b, c],
      entries: [entry(a, x, { loadKg: 30 }), entry(b, x, { loadKg: 45 }), entry(c, x, { loadKg: 40 })],
    });
    const records = recordsByExercise(d).get(x.id)!;
    const chart = chartModel(x, records, bestRecord(x, records))!;
    expect(chart.ticks.map((t) => t.value)).toEqual([30, 35, 40, 45]);
    expect(chart.ticks.map((t) => t.fy)).toEqual([1, 0.6667, 0.3333, 0]);
    // 20 de 49 dias
    expect(chart.points.map((p) => p.fx)).toEqual([0, 0.4082, 1]);
    // 30 kg embaixo, 45 kg em cima
    expect(chart.points.map((p) => p.fy)).toEqual([1, 0, 0.3333]);
    expect(chart.points.map((p) => p.best)).toEqual([false, true, false]);
    expect(chart.points[2].last).toBe(true);
    expect(chart.dates.map((d) => d.label)).toEqual(["12 ago", "6 set", "30 set"]);
  });

  it("menos de 2 registros com número: sem gráfico", () => {
    const x = exercise();
    const a = session("2026-08-12");
    const b = session("2026-08-15");
    const d = data({ exercises: [x], sessions: [a, b], entries: [entry(a, x, { loadKg: 30 }), entry(b, x, { loadKg: null, reps: 10 })] });
    expect(chartModel(x, recordsByExercise(d).get(x.id)!, null)).toBeNull();
  });

  it("tudo igual: linha reta no meio da faixa", () => {
    const x = exercise({ kind: "TIME" });
    const a = session("2026-09-01");
    const b = session("2026-09-08");
    const d = data({ exercises: [x], sessions: [a, b], entries: [entry(a, x, { minutes: 20 }), entry(b, x, { minutes: 20 })] });
    const chart = chartModel(x, recordsByExercise(d).get(x.id)!, null)!;
    expect(chart.ticks.map((t) => t.value)).toEqual([19, 20, 21]);
    expect(chart.points.map((p) => p.fy)).toEqual([0.5, 0.5]);
  });
});

describe("schemas", () => {
  it("lê numeric do banco como número", () => {
    const row = exerciseRowSchema.parse({ id: "1", name: "Leg press", kind: "LOAD", goal: "42.50", archived_at: null, created_at: "x" });
    expect(row.goal).toBe(42.5);
  });

  it("valida os números do exercício", () => {
    expect(entryPatchSchema.safeParse({ sets: 4, reps: 10, loadKg: 42.556 }).data?.loadKg).toBe(42.56);
    expect(entryPatchSchema.safeParse({ sets: 0 }).success).toBe(false);
    expect(entryPatchSchema.safeParse({ reps: 2.5 }).success).toBe(false);
    expect(entryPatchSchema.safeParse({ minutes: 2000 }).success).toBe(false);
    expect(entryPatchSchema.safeParse({ loadKg: null, done: true }).success).toBe(true);
    expect(entryPatchSchema.safeParse({}).success).toBe(false);
  });

  it("exercício da lista ou novo; começo vazio, por treino ou por ficha", () => {
    expect(exerciseTargetSchema.safeParse({ name: "  Remada  ", kind: "LOAD" }).data).toEqual({ name: "Remada", kind: "LOAD" });
    expect(exerciseTargetSchema.safeParse({ name: " ", kind: "LOAD" }).success).toBe(false);
    expect(exerciseTargetSchema.safeParse({ exerciseId: "nao-e-uuid" }).success).toBe(false);
    expect(startSchema.safeParse({ from: "empty" }).success).toBe(true);
    expect(startSchema.safeParse({ from: "plan" }).success).toBe(false);
  });
});
