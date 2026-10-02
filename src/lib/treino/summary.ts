import type { WorkoutData, WorkoutEntry, WorkoutExercise, WorkoutPlan, WorkoutSession } from "@/types/workout";
import { WEEKDAYS_SHORT, addDays, daysBetween, pastDayTitle, shortDate, startOfWeek, weekday } from "@/lib/dates";
import { compareValues, formatNumber, metricOf, type Change } from "./format";

/** Ordem dos treinos no tempo: o dia e, no mesmo dia, a hora em que começou. */
export function compareSessions(a: WorkoutSession, b: WorkoutSession): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.startedAt === b.startedAt) return 0;
  return a.startedAt < b.startedAt ? -1 : 1;
}

/** Um exercício feito num treino. */
export type WorkoutRecord = { entry: WorkoutEntry; session: WorkoutSession };

/** Registros feitos de cada exercício, do mais antigo ao mais novo. */
export function recordsByExercise(data: WorkoutData): Map<string, WorkoutRecord[]> {
  const sessions = new Map(data.sessions.map((s) => [s.id, s]));
  const out = new Map<string, WorkoutRecord[]>();
  for (const entry of data.entries) {
    const session = sessions.get(entry.sessionId);
    if (!entry.done || !session) continue;
    out.set(entry.exerciseId, [...(out.get(entry.exerciseId) ?? []), { entry, session }]);
  }
  for (const list of out.values()) list.sort((a, b) => compareSessions(a.session, b.session));
  return out;
}

/** A última vez antes de um treino (sem contar ele mesmo). Sem treino, a mais recente de todas. */
export function lastBefore(records: WorkoutRecord[], before?: WorkoutSession): WorkoutRecord | null {
  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i];
    if (!before) return record;
    if (record.session.id !== before.id && compareSessions(record.session, before) < 0) return record;
  }
  return null;
}

/**
 * Melhor marca: o maior número do tipo (kg, repetições, minutos). Empate na Carga: mais
 * repetições; no Peso do corpo, mais séries; persistindo, a mais recente.
 */
export function bestRecord(exercise: WorkoutExercise, records: WorkoutRecord[]): WorkoutRecord | null {
  let best: WorkoutRecord | null = null;
  const score = (r: WorkoutRecord): [number, number] => [
    metricOf(exercise.kind, r.entry) ?? -1,
    (exercise.kind === "LOAD" ? r.entry.reps : exercise.kind === "BODYWEIGHT" ? r.entry.sets : 0) ?? 0,
  ];
  for (const record of records) {
    const [main, tie] = score(record);
    if (main < 0) continue;
    if (!best) {
      best = record;
      continue;
    }
    const [bestMain, bestTie] = score(best);
    if (main > bestMain || (main === bestMain && tie >= bestTie)) best = record;
  }
  return best;
}

export type GoalProgress = { current: number | null; target: number; percent: number; reached: boolean };

export type ExerciseSummary = {
  exercise: WorkoutExercise;
  count: number;
  first: WorkoutRecord | null;
  last: WorkoutRecord | null;
  best: WorkoutRecord | null;
  /** Do primeiro registro ao último (só com 2 ou mais). */
  change: Change | null;
  goal: GoalProgress | null;
};

/** A meta compara com a última vez (não com a melhor marca). */
export function goalProgress(exercise: WorkoutExercise, last: WorkoutRecord | null): GoalProgress | null {
  if (!exercise.goal) return null;
  const current = last ? metricOf(exercise.kind, last.entry) : null;
  const percent = current ? Math.min(100, Math.round((current / exercise.goal) * 100)) : 0;
  return { current, target: exercise.goal, percent, reached: current !== null && current >= exercise.goal };
}

export function summarizeExercise(exercise: WorkoutExercise, records: WorkoutRecord[]): ExerciseSummary {
  const first = records[0] ?? null;
  const last = records.at(-1) ?? null;
  return {
    exercise,
    count: records.length,
    first,
    last,
    best: bestRecord(exercise, records),
    change: first && last && records.length > 1 ? compareValues(exercise.kind, first.entry, last.entry) : null,
    goal: goalProgress(exercise, last),
  };
}

/** Exercícios valendo (sem os guardados): primeiro os feitos mais recentemente; os nunca feitos no fim, por nome. */
export function evolution(data: WorkoutData, records = recordsByExercise(data)): ExerciseSummary[] {
  return data.exercises
    .filter((e) => !e.archivedAt)
    .map((e) => summarizeExercise(e, records.get(e.id) ?? []))
    .sort((a, b) => {
      if (a.last && b.last) return compareSessions(b.last.session, a.last.session) || a.exercise.name.localeCompare(b.exercise.name, "pt-BR");
      if (a.last || b.last) return a.last ? -1 : 1;
      return a.exercise.name.localeCompare(b.exercise.name, "pt-BR");
    });
}

// ------------------------------------------------------------------
// Treinos
// ------------------------------------------------------------------

/** Exercícios de um treino, na ordem da tela. */
export function entriesOf(sessionId: string, data: WorkoutData): WorkoutEntry[] {
  return data.entries
    .filter((e) => e.sessionId === sessionId)
    .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
}

/** O treino em andamento (só existe um por vez). */
export function openSession(data: WorkoutData): WorkoutSession | null {
  return data.sessions.find((s) => s.finishedAt === null) ?? null;
}

/** "Supino reto, Crucifixo, Tríceps corda +2" */
export function namesLabel(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export type SessionSummary = {
  session: WorkoutSession;
  /** Nome da ficha; sem ficha, os exercícios. */
  title: string;
  /** Os exercícios (quando o título é a ficha). */
  names: string;
  done: number;
  total: number;
  /** Feitos que subiram em relação à vez anterior. */
  ups: number;
};

export function summarizeSession(session: WorkoutSession, data: WorkoutData, records = recordsByExercise(data)): SessionSummary {
  const exercises = new Map(data.exercises.map((e) => [e.id, e]));
  const entries = entriesOf(session.id, data);
  const shown = session.finishedAt ? entries.filter((e) => e.done) : entries;
  const names = namesLabel(shown.map((e) => exercises.get(e.exerciseId)?.name ?? "Exercício"));
  const plan = session.planId ? data.plans.find((p) => p.id === session.planId) : undefined;
  let ups = 0;
  for (const entry of entries) {
    const exercise = exercises.get(entry.exerciseId);
    if (!entry.done || !exercise) continue;
    const before = lastBefore(records.get(entry.exerciseId) ?? [], session);
    if (before && compareValues(exercise.kind, before.entry, entry).direction === "up") ups++;
  }
  return {
    session,
    title: plan?.name ?? (names || "Treino sem exercícios"),
    names: plan ? names : "",
    done: entries.filter((e) => e.done).length,
    total: entries.length,
    ups,
  };
}

/** Treinos concluídos, do mais novo ao mais velho. */
export function finishedSessions(data: WorkoutData): WorkoutSession[] {
  return data.sessions.filter((s) => s.finishedAt !== null).sort((a, b) => compareSessions(b, a));
}

/** "2 subiram" · "1 subiu" */
export function upsLabel(ups: number): string | null {
  if (ups === 0) return null;
  return ups === 1 ? "1 subiu" : `${ups} subiram`;
}

/** Último treino, em relação a hoje: "hoje" · "ontem" · "segunda, 28 set". */
export function dayLabel(date: string, today: string): string {
  return pastDayTitle(date, today).toLocaleLowerCase("pt-BR");
}

// ------------------------------------------------------------------
// Fichas
// ------------------------------------------------------------------

export function sortPlans(plans: WorkoutPlan[]): WorkoutPlan[] {
  return [...plans].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
}

/** Rodízio: a ficha depois da usada por último (A → B → C → A). Nenhuma usada: a primeira. */
export function nextPlan(data: WorkoutData): WorkoutPlan | null {
  const plans = sortPlans(data.plans);
  if (plans.length === 0) return null;
  const ids = new Set(plans.map((p) => p.id));
  const last = data.sessions.filter((s) => s.planId && ids.has(s.planId)).sort(compareSessions).at(-1);
  if (!last) return plans[0];
  const index = plans.findIndex((p) => p.id === last.planId);
  return plans[(index + 1) % plans.length];
}

/** Nome sugerido para a próxima ficha: a primeira letra livre (Treino A, Treino B…). */
export function suggestPlanName(plans: WorkoutPlan[]): string {
  const used = new Set(plans.map((p) => p.name.trim().toLocaleLowerCase("pt-BR")));
  for (const letter of "ABCDEFGHIJ") {
    const name = `Treino ${letter}`;
    if (!used.has(name.toLocaleLowerCase("pt-BR"))) return name;
  }
  return `Treino ${plans.length + 1}`;
}

// ------------------------------------------------------------------
// Frequência
// ------------------------------------------------------------------

/** Dias com pelo menos um exercício feito. */
export function trainedDates(data: WorkoutData): Set<string> {
  const withDone = new Set(data.entries.filter((e) => e.done).map((e) => e.sessionId));
  return new Set(data.sessions.filter((s) => withDone.has(s.id)).map((s) => s.date));
}

export type FrequencyDay = { date: string; label: string; trained: boolean; today: boolean; future: boolean };
export type FrequencyWeek = { start: string; days: FrequencyDay[]; count: number; hit: boolean };

export type Frequency = {
  goal: number | null;
  /** Esta semana (segunda a domingo). */
  current: FrequencyWeek;
  /** As últimas semanas, da mais antiga até esta. */
  weeks: FrequencyWeek[];
  /** Média das semanas completas desde a primeira com treino (precisa de 2). */
  average: number | null;
};

export function frequency(data: WorkoutData, today: string, weeks = 8): Frequency {
  const trained = trainedDates(data);
  const goal = data.weeklyGoal;
  const thisWeek = startOfWeek(today);
  const list: FrequencyWeek[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    const days = Array.from({ length: 7 }, (_, d): FrequencyDay => {
      const date = addDays(start, d);
      return { date, label: WEEKDAYS_SHORT[weekday(date)], trained: trained.has(date), today: date === today, future: date > today };
    });
    const count = days.filter((d) => d.trained).length;
    list.push({ start, days, count, hit: goal !== null && count >= goal });
  }
  const past = list.slice(0, -1);
  const first = past.findIndex((w) => w.count > 0);
  const counted = first >= 0 ? past.slice(first) : [];
  const average = counted.length >= 2 ? Math.round((counted.reduce((sum, w) => sum + w.count, 0) / counted.length) * 10) / 10 : null;
  return { goal, current: list[list.length - 1], weeks: list, average };
}

/** "2 de 4" · "3 treinos" · "1 treino" · "Nenhum" — o número do card e da tela. */
export function weekCountLabel(count: number, goal: number | null): string {
  if (goal) return `${count} de ${goal}`;
  if (count === 0) return "Nenhum";
  return count === 1 ? "1 treino" : `${count} treinos`;
}

/** Barra lateral: em andamento, ou a semana. Semana zerada com meta mostra a meta (sem cobrança). */
export function navLabel(freq: Frequency, inProgress: boolean): string {
  if (inProgress) return "Treino em andamento";
  const { count } = freq.current;
  if (freq.goal) return count === 0 ? `Meta: ${freq.goal} na semana` : `${count} de ${freq.goal} na semana`;
  if (count === 0) return "Nada registrado na semana";
  return count === 1 ? "1 treino na semana" : `${count} treinos na semana`;
}

/** "média de 2,9 por semana" */
export function averageLabel(average: number): string {
  return `média de ${formatNumber(average)} por semana`;
}

// ------------------------------------------------------------------
// Gráfico da página do exercício
// ------------------------------------------------------------------

/** Ponto do gráfico em proporção da área do desenho: fx 0 → 1 (esquerda → direita), fy 0 → 1 (cima → baixo). */
export type ChartPoint = { fx: number; fy: number; value: number; date: string; best: boolean; last: boolean };
export type ChartModel = {
  points: ChartPoint[];
  /** Linhas de grade com o número (fy como nos pontos). */
  ticks: { fy: number; value: number }[];
  dates: { fx: number; label: string; anchor: "start" | "middle" | "end" }[];
};

const STEPS = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
/** Repetições e minutos são inteiros: a grade não passa por 22,5. */
const WHOLE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

/** Passo "redondo" que divide a faixa em até 4 partes. */
export function niceStep(range: number, whole = false): number {
  const steps = whole ? WHOLE_STEPS : STEPS;
  return steps.find((s) => range / s <= 4) ?? steps[steps.length - 1];
}

/**
 * Pontos do gráfico (um por treino), na escala: x pelo dia, y pelo número do tipo.
 * Menos de 2 registros com número: sem gráfico.
 */
export function chartModel(exercise: WorkoutExercise, records: WorkoutRecord[], best: WorkoutRecord | null): ChartModel | null {
  const withValue = records.flatMap((r) => {
    const value = metricOf(exercise.kind, r.entry);
    return value === null ? [] : [{ record: r, value }];
  });
  if (withValue.length < 2) return null;

  const values = withValue.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const whole = exercise.kind !== "LOAD";
  let step: number;
  let lo: number;
  let hi: number;
  if (max === min) {
    // Tudo igual: a linha fica no meio de uma faixa pequena.
    step = niceStep(Math.max(2, max * 0.2), whole);
    lo = Math.max(0, Math.floor(min / step) * step - step);
    hi = Math.ceil(max / step) * step + step;
  } else {
    step = niceStep(max - min, whole);
    lo = Math.floor(min / step) * step;
    hi = Math.ceil(max / step) * step;
  }
  const round = (n: number) => Math.round(n * 10000) / 10000;
  const fyOf = (v: number) => round((hi - v) / (hi - lo));

  const firstDate = withValue[0].record.session.date;
  const span = daysBetween(firstDate, withValue[withValue.length - 1].record.session.date);
  const fxOf = (i: number, date: string) => round(span > 0 ? daysBetween(firstDate, date) / span : i / (withValue.length - 1));

  const points = withValue.map(({ record, value }, i): ChartPoint => ({
    fx: fxOf(i, record.session.date),
    fy: fyOf(value),
    value,
    date: record.session.date,
    best: record === best,
    last: i === withValue.length - 1,
  }));

  const ticks: ChartModel["ticks"] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push({ fy: fyOf(v), value: Math.round(v * 100) / 100 });

  const lastDate = points[points.length - 1].date;
  const dates: ChartModel["dates"] = [{ fx: 0, label: shortDate(firstDate), anchor: "start" }];
  if (span >= 14) dates.push({ fx: 0.5, label: shortDate(addDays(firstDate, Math.round(span / 2))), anchor: "middle" });
  if (lastDate !== firstDate) dates.push({ fx: 1, label: shortDate(lastDate), anchor: "end" });

  return { points, ticks, dates };
}
