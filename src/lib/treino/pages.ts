import { unstable_rethrow } from "next/navigation";
import type { CalendarEvent, Occurrence } from "@/types/event";
import type { Area } from "@/types/project";
import type { EntryValues, ExerciseKind, WorkoutData, WorkoutEntry, WorkoutExercise, WorkoutPlan, WorkoutSession } from "@/types/workout";
import { nowIn, pastDayTitle } from "@/lib/dates";
import { listEvents } from "@/lib/events/queries";
import { isRecurring, occurrencesBetween, type Now } from "@/lib/events/occurrences";
import { getOriginPage, type OriginPage } from "@/lib/origins/queries";
import { descendantIds } from "@/lib/origins/tree";
import { listAreas } from "@/lib/projects/queries";
import { compareValues, formatValues, type Change } from "./format";
import { listWorkoutData } from "./queries";
import {
  chartModel,
  compareSessions,
  entriesOf,
  evolution,
  finishedSessions,
  frequency,
  lastBefore,
  namesLabel,
  navLabel,
  nextPlan,
  openSession,
  recordsByExercise,
  sortPlans,
  suggestPlanName,
  summarizeExercise,
  summarizeSession,
  weekCountLabel,
  type ChartModel,
  type ExerciseSummary,
  type Frequency,
  type SessionSummary,
  type WorkoutRecord,
} from "./summary";

/** Quanto da tela do Treino mostra (o resto fica em Exercícios e no Histórico). */
const EVOLUTION_ON_PAGE = 5;
const SESSIONS_ON_PAGE = 4;
const REPEAT_CHOICES = 8;
const ACTIONS_ON_MODULE = 8;

/** Compromissos com origem no Treino (ou abaixo dele). */
function trainingEvents(areas: Area[], events: CalendarEvent[]): { root: Area | undefined; events: CalendarEvent[] } {
  const root = areas.find((a) => a.module === "TREINO" && a.parentId === null);
  if (!root) return { root, events: [] };
  const inside = descendantIds(root.id, areas);
  return { root, events: events.filter((e) => e.areaId && inside.has(e.areaId)) };
}

/** A academia de hoje: o próximo horário do Treino que ainda não passou (senão, o último do dia). */
function academyToday(events: CalendarEvent[], now: Now): Occurrence | null {
  const today = occurrencesBetween(events, now.date, now.date, now);
  return today.find((o) => !o.past) ?? today.at(-1) ?? null;
}

/** Uma ficha na tela: os exercícios dela e se é a da vez. */
export type PlanCard = { plan: WorkoutPlan; names: string; count: number; next: boolean };

function planCards(data: WorkoutData): PlanCard[] {
  const exercises = new Map(data.exercises.map((e) => [e.id, e]));
  const next = nextPlan(data);
  return sortPlans(data.plans).map((plan) => {
    const names = data.planItems
      .filter((i) => i.planId === plan.id)
      .sort((a, b) => a.position - b.position)
      .flatMap((i) => {
        const exercise = exercises.get(i.exerciseId);
        return exercise && !exercise.archivedAt ? [exercise.name] : [];
      });
    return { plan, names: namesLabel(names), count: names.length, next: plan.id === next?.id };
  });
}

export type TreinoPage = {
  root: Area;
  context: OriginPage;
  actions: OriginPage["actions"];
  /** Abertas no Treino inteiro. */
  openActions: number;
  now: Now;
  /** Treino em andamento. */
  open: SessionSummary | null;
  /** Concluídos hoje. */
  todayDone: SessionSummary[];
  /** O último concluído (para "Último: ontem"). */
  last: SessionSummary | null;
  plans: PlanCard[];
  recent: SessionSummary[];
  /** Para "Repetir um treino". */
  repeatable: SessionSummary[];
  evolution: ExerciseSummary[];
  exerciseCount: number;
  frequency: Frequency;
  academy: Occurrence | null;
  /** Já existe horário da academia (compromisso do Treino que se repete). */
  hasSchedule: boolean;
  events: CalendarEvent[];
  areas: Area[];
};

export async function getTreinoPage(): Promise<TreinoPage | null> {
  const [data, areas, allEvents] = await Promise.all([listWorkoutData(), listAreas(), listEvents()]);
  const { root, events } = trainingEvents(areas, allEvents);
  if (!root) return null;
  const context = await getOriginPage(root.id);
  if (!context) return null;

  const now = nowIn();
  const records = recordsByExercise(data);
  const finished = finishedSessions(data);
  const summarize = (s: WorkoutSession) => summarizeSession(s, data, records);
  const open = openSession(data);
  const list = evolution(data, records);

  return {
    root,
    context,
    actions: context.actions.slice(0, ACTIONS_ON_MODULE),
    openActions: context.actions.length,
    now,
    open: open ? summarize(open) : null,
    todayDone: finished.filter((s) => s.date === now.date).map(summarize),
    last: finished[0] ? summarize(finished[0]) : null,
    plans: planCards(data),
    recent: finished.slice(0, SESSIONS_ON_PAGE).map(summarize),
    repeatable: finished.slice(0, REPEAT_CHOICES).map(summarize),
    evolution: list.filter((s) => s.last).slice(0, EVOLUTION_ON_PAGE),
    exerciseCount: list.length,
    frequency: frequency(data, now.date),
    academy: academyToday(events, now),
    hasSchedule: events.some(isRecurring),
    events: allEvents,
    areas,
  };
}

// ------------------------------------------------------------------
// Um treino
// ------------------------------------------------------------------

/** "Última: 4×8 · 50 kg · seg, 28 set" — os números e o dia. */
export type LastTime = { values: EntryValues; label: string; date: string };

function lastTime(kind: ExerciseKind, record: WorkoutRecord | null): LastTime | null {
  if (!record) return null;
  return { values: record.entry, label: formatValues(kind, record.entry), date: record.session.date };
}

export type EntryRow = { entry: WorkoutEntry; exercise: WorkoutExercise; last: LastTime | null };

/** Exercício na lista de escolha: o nome, o tipo e a última vez. */
export type CatalogItem = { id: string; name: string; kind: ExerciseKind; last: string | null };

function catalog(data: WorkoutData, records: Map<string, WorkoutRecord[]>): CatalogItem[] {
  return evolution(data, records).map(({ exercise, last }) => ({
    id: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
    last: last ? formatValues(exercise.kind, last.entry) : null,
  }));
}

export type WorkoutPage = {
  session: WorkoutSession;
  title: string;
  summary: SessionSummary;
  rows: EntryRow[];
  catalog: CatalogItem[];
  plan: WorkoutPlan | null;
  /** O que subiu em relação à vez anterior (só os feitos). */
  ups: { name: string; change: Change }[];
  suggestedPlanName: string;
  today: string;
};

/** "Treino de hoje" · "Treino de ontem" · "Treino de segunda, 28 set" */
export function workoutTitle(date: string, today: string): string {
  return `Treino de ${pastDayTitle(date, today).toLocaleLowerCase("pt-BR")}`;
}

export async function getWorkoutPage(id: string): Promise<WorkoutPage | null> {
  const data = await listWorkoutData();
  const session = data.sessions.find((s) => s.id === id);
  if (!session) return null;

  const today = nowIn().date;
  const records = recordsByExercise(data);
  const exercises = new Map(data.exercises.map((e) => [e.id, e]));
  const rows = entriesOf(session.id, data).flatMap((entry): EntryRow[] => {
    const exercise = exercises.get(entry.exerciseId);
    if (!exercise) return [];
    return [{ entry, exercise, last: lastTime(exercise.kind, lastBefore(records.get(exercise.id) ?? [], session)) }];
  });

  return {
    session,
    title: workoutTitle(session.date, today),
    summary: summarizeSession(session, data, records),
    rows,
    catalog: catalog(data, records),
    plan: data.plans.find((p) => p.id === session.planId) ?? null,
    ups: rows.flatMap((r) => {
      if (!r.entry.done || !r.last) return [];
      const change = compareValues(r.exercise.kind, r.last.values, r.entry);
      return change.direction === "up" ? [{ name: r.exercise.name, change }] : [];
    }),
    suggestedPlanName: suggestPlanName(data.plans),
    today,
  };
}

// ------------------------------------------------------------------
// Exercícios
// ------------------------------------------------------------------

/** Uma vez na lista de registros do exercício. */
export type RecordRow = { sessionId: string; date: string; label: string; best: boolean; change: Change | null };

export type ExercisePage = {
  summary: ExerciseSummary;
  /** Do mais novo ao mais velho. */
  records: RecordRow[];
  chart: ChartModel | null;
  plans: WorkoutPlan[];
  today: string;
};

export async function getExercisePage(id: string): Promise<ExercisePage | null> {
  const data = await listWorkoutData();
  const exercise = data.exercises.find((e) => e.id === id);
  if (!exercise) return null;

  const records = recordsByExercise(data).get(exercise.id) ?? [];
  const summary = summarizeExercise(exercise, records);
  const planIds = new Set(data.planItems.filter((i) => i.exerciseId === exercise.id).map((i) => i.planId));

  return {
    summary,
    records: records
      .map((record, i): RecordRow => ({
        sessionId: record.session.id,
        date: record.session.date,
        label: formatValues(exercise.kind, record.entry),
        best: record === summary.best && records.length > 1,
        change: i > 0 ? compareValues(exercise.kind, records[i - 1].entry, record.entry) : null,
      }))
      .reverse(),
    chart: chartModel(exercise, records, summary.best),
    plans: sortPlans(data.plans).filter((p) => planIds.has(p.id)),
    today: nowIn().date,
  };
}

export type ExercisesPage = { list: ExerciseSummary[]; archived: WorkoutExercise[]; today: string };

export async function getExercisesPage(): Promise<ExercisesPage> {
  const data = await listWorkoutData();
  return {
    list: evolution(data),
    archived: data.exercises.filter((e) => e.archivedAt).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    today: nowIn().date,
  };
}

// ------------------------------------------------------------------
// Histórico e fichas
// ------------------------------------------------------------------

/** O histórico mostra os últimos (o volume é de alguns por semana). */
const HISTORY_LIMIT = 120;

export type HistoryPage = { sessions: SessionSummary[]; total: number; today: string };

export async function getHistoryPage(): Promise<HistoryPage> {
  const data = await listWorkoutData();
  const records = recordsByExercise(data);
  const finished = finishedSessions(data);
  return {
    sessions: finished.slice(0, HISTORY_LIMIT).map((s) => summarizeSession(s, data, records)),
    total: finished.length,
    today: nowIn().date,
  };
}

export type PlanItemRow = { id: string; exercise: WorkoutExercise; last: string | null };

export type PlanPage = {
  plan: WorkoutPlan;
  items: PlanItemRow[];
  next: boolean;
  /** Treinos feitos com esta ficha. */
  used: number;
  lastUsed: string | null;
  catalog: CatalogItem[];
  /** Já existe um treino em andamento (Começar abre ele). */
  inProgress: boolean;
  today: string;
};

export async function getPlanPage(id: string): Promise<PlanPage | null> {
  const data = await listWorkoutData();
  const plan = data.plans.find((p) => p.id === id);
  if (!plan) return null;

  const records = recordsByExercise(data);
  const exercises = new Map(data.exercises.map((e) => [e.id, e]));
  const sessions = data.sessions.filter((s) => s.planId === plan.id).sort(compareSessions);

  return {
    plan,
    items: data.planItems
      .filter((i) => i.planId === plan.id)
      .sort((a, b) => a.position - b.position)
      .flatMap((item): PlanItemRow[] => {
        const exercise = exercises.get(item.exerciseId);
        if (!exercise) return [];
        const last = lastBefore(records.get(exercise.id) ?? []);
        return [{ id: item.id, exercise, last: last ? formatValues(exercise.kind, last.entry) : null }];
      }),
    next: nextPlan(data)?.id === plan.id,
    used: sessions.length,
    lastUsed: sessions.at(-1)?.date ?? null,
    catalog: catalog(data, records),
    inProgress: openSession(data) !== null,
    today: nowIn().date,
  };
}

// ------------------------------------------------------------------
// Barra lateral e Central
// ------------------------------------------------------------------

/**
 * Sem as tabelas do Treino (migration ainda não aplicada), barra lateral e Central seguem
 * sem ele em vez de cair.
 */
async function safely<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    // Redirecionamento (sessão expirada) e avisos internos do Next seguem adiante.
    unstable_rethrow(error);
    console.warn("Treino indisponível (a migration 20261005120000_treino.sql foi aplicada?)", error);
    return null;
  }
}

/** Barra lateral: "2 de 4 na semana" · "Treino em andamento". */
export function getTreinoNav(): Promise<{ attention: string } | null> {
  return safely(async () => {
    const data = await listWorkoutData();
    return { attention: navLabel(frequency(data, nowIn().date, 1), openSession(data) !== null) };
  });
}

/** Card de "Minha vida": a semana (com a meta) e a linha de baixo (em andamento, academia hoje ou o último treino). */
export function getTreinoCentral(): Promise<{ value: string; foot: string } | null> {
  return safely(async () => {
    const [data, areas, allEvents] = await Promise.all([listWorkoutData(), listAreas(), listEvents()]);
    const now = nowIn();
    const freq = frequency(data, now.date, 1);
    const value = weekCountLabel(freq.current.count, freq.goal);
    if (openSession(data)) return { value, foot: "Treino em andamento" };

    const academy = academyToday(trainingEvents(areas, allEvents).events, now);
    if (academy && !academy.past) return { value, foot: `${academy.title} hoje${academy.startTime ? ` · ${academy.startTime}` : ""}` };

    const last = finishedSessions(data)[0];
    if (last) return { value, foot: `Último: ${pastDayTitle(last.date, now.date).toLocaleLowerCase("pt-BR")}` };
    return { value, foot: "Nenhum treino registrado" };
  });
}
