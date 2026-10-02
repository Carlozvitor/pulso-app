"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import type { CreateResult } from "@/lib/projects/actions";
import type { ActionResult } from "@/lib/tasks/actions";
import type { ExerciseKind, WorkoutData, WorkoutEntry, WorkoutSession } from "@/types/workout";
import { valuesFor } from "./format";
import { listWorkoutData } from "./queries";
import {
  entryPatchSchema,
  entryPatchToRow,
  exerciseKindSchema,
  exerciseNameSchema,
  exercisePatchSchema,
  exerciseTargetSchema,
  planNameSchema,
  startSchema,
  weeklyGoalSchema,
  workoutIdSchema,
  type EntryPatch,
  type ExercisePatch,
  type ExerciseTarget,
  type StartInput,
} from "./schemas";
import { entriesOf, lastBefore, openSession, recordsByExercise, sortPlans, type WorkoutRecord } from "./summary";

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";
const NAME_TAKEN = "Já existe um exercício com esse nome.";
const GONE = "Esse treino não existe mais.";

/** Postgres: valor repetido (nome de exercício, treino em andamento, exercício já no treino). */
const UNIQUE = "23505";

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];
type Failure = { ok: false; error: string };

const fail = (error = GENERIC_ERROR): Failure => ({ ok: false, error });

/** Os números da última vez, para o exercício já vir preenchido. */
function prefill(kind: ExerciseKind, records: WorkoutRecord[] | undefined, before?: WorkoutSession) {
  const last = lastBefore(records ?? [], before);
  if (!last) return {};
  const v = valuesFor(kind, last.entry);
  return { sets: v.sets, reps: v.reps, load_kg: v.loadKg, minutes: v.minutes };
}

/**
 * Exercício escolhido da lista ou criado na hora. Nome que já existe (mesmo guardado) é
 * o mesmo exercício: volta para a lista e mantém o tipo dele.
 */
async function resolveExercise(supabase: Supabase, data: WorkoutData, target: ExerciseTarget): Promise<{ ok: true; id: string; kind: ExerciseKind } | Failure> {
  const parsed = exerciseTargetSchema.safeParse(target);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  if ("exerciseId" in parsed.data) {
    const exercise = data.exercises.find((e) => e.id === (parsed.data as { exerciseId: string }).exerciseId);
    return exercise ? { ok: true, id: exercise.id, kind: exercise.kind } : fail("Esse exercício não existe mais.");
  }

  const { name, kind } = parsed.data;
  const same = data.exercises.find((e) => e.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"));
  if (same) {
    if (same.archivedAt) {
      const { error } = await supabase.from("workout_exercises").update({ archived_at: null }).eq("id", same.id);
      if (error) return fail();
    }
    return { ok: true, id: same.id, kind: same.kind };
  }

  const { data: row, error } = await supabase.from("workout_exercises").insert({ name, kind }).select("id").single();
  if (error) return fail(error.code === UNIQUE ? NAME_TAKEN : GENERIC_ERROR);
  return { ok: true, id: row.id, kind };
}

// ------------------------------------------------------------------
// Treino
// ------------------------------------------------------------------

/**
 * Começa um treino: vazio, repetindo um anterior (os exercícios feitos nele) ou por uma ficha.
 * Cada exercício já vem com os números da última vez. Já existe um em andamento: abre ele.
 */
export async function startWorkout(input: StartInput): Promise<CreateResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fail();

  const { supabase } = await requireUser();
  const data = await listWorkoutData();
  const open = openSession(data);
  if (open) return { ok: true, id: open.id };

  let exerciseIds: string[] = [];
  let planId: string | null = null;
  const from = parsed.data;
  if (from.from === "plan") {
    const plan = data.plans.find((p) => p.id === from.planId);
    if (!plan) return fail("Essa ficha não existe mais.");
    planId = plan.id;
    exerciseIds = data.planItems
      .filter((i) => i.planId === plan.id)
      .sort((a, b) => a.position - b.position)
      .map((i) => i.exerciseId);
  } else if (from.from === "session") {
    if (!data.sessions.some((s) => s.id === from.sessionId)) return fail(GONE);
    exerciseIds = entriesOf(from.sessionId, data)
      .filter((e) => e.done)
      .map((e) => e.exerciseId);
  }
  const exercises = new Map(data.exercises.filter((e) => !e.archivedAt).map((e) => [e.id, e]));
  exerciseIds = exerciseIds.filter((id) => exercises.has(id));

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({ date: todayIn(), plan_id: planId })
    .select("id")
    .single();
  if (error) {
    // Outro aparelho começou um ao mesmo tempo: abre esse.
    if (error.code !== UNIQUE) return fail();
    const { data: existing } = await supabase.from("workout_sessions").select("id").is("finished_at", null).maybeSingle();
    return existing ? { ok: true, id: existing.id } : fail();
  }

  if (exerciseIds.length > 0) {
    const records = recordsByExercise(data);
    const rows = exerciseIds.map((exerciseId, position) => ({
      session_id: session.id,
      exercise_id: exerciseId,
      position,
      ...prefill(exercises.get(exerciseId)!.kind, records.get(exerciseId)),
    }));
    const { error: entriesError } = await supabase.from("workout_entries").insert(rows);
    if (entriesError) {
      await supabase.from("workout_sessions").delete().eq("id", session.id);
      return fail();
    }
  }

  refresh();
  return { ok: true, id: session.id };
}

/** Exercício novo no treino, já com os números da última vez. */
export async function addWorkoutEntry(sessionId: string, target: ExerciseTarget): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(sessionId);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const data = await listWorkoutData();
  const session = data.sessions.find((s) => s.id === parsedId.data);
  if (!session) return fail(GONE);

  const exercise = await resolveExercise(supabase, data, target);
  if (!exercise.ok) return exercise;
  const entries = entriesOf(session.id, data);
  if (entries.some((e) => e.exerciseId === exercise.id)) return { ok: true };

  const { error } = await supabase.from("workout_entries").insert({
    session_id: session.id,
    exercise_id: exercise.id,
    position: entries.reduce((max, e) => Math.max(max, e.position + 1), 0),
    ...prefill(exercise.kind, recordsByExercise(data).get(exercise.id), session),
  });
  if (error && error.code !== UNIQUE) return fail();

  refresh();
  return { ok: true };
}

/** Números e "feito" de um exercício no treino. */
export async function updateWorkoutEntry(id: string, patch: EntryPatch): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  const parsed = entryPatchSchema.safeParse(patch);
  if (!parsedId.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_entries").update(entryPatchToRow(parsed.data)).eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Tira um exercício do treino (só os não marcados; o feito precisa ser desmarcado antes). */
export async function removeWorkoutEntry(id: string): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_entries").delete().eq("id", parsedId.data).eq("done", false);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Concluir: guarda só os exercícios marcados como feitos. */
export async function finishWorkout(sessionId: string): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(sessionId);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("workout_entries")
    .select("id", { count: "exact", head: true })
    .eq("session_id", parsedId.data)
    .eq("done", true);
  if (error) return fail();
  if (!count) return fail("Marque pelo menos um exercício como feito. Se não rolou treino, descarte.");

  const cleared = await supabase.from("workout_entries").delete().eq("session_id", parsedId.data).eq("done", false);
  if (cleared.error) return fail();
  const { error: finishError } = await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .is("finished_at", null);
  if (finishError) return fail();

  refresh();
  return { ok: true };
}

/** Dia do treino (registrou depois, passou da meia-noite…). Não vale dia que ainda não chegou. */
export async function setWorkoutDate(sessionId: string, date: string): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(sessionId);
  const parsedDate = z.iso.date().safeParse(date);
  if (!parsedId.success) return fail();
  if (!parsedDate.success) return fail("Escolha um dia.");
  if (parsedDate.data > todayIn()) return fail("O treino não pode ser num dia que ainda não chegou.");

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_sessions").update({ date: parsedDate.data }).eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Descarta (em andamento) ou apaga (concluído) um treino, com os registros dele. */
export async function deleteWorkout(sessionId: string): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(sessionId);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_sessions").delete().eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------
// Exercícios
// ------------------------------------------------------------------

export async function createExercise(input: { name: string; kind: ExerciseKind }): Promise<CreateResult> {
  const name = exerciseNameSchema.safeParse(input.name);
  const kind = exerciseKindSchema.safeParse(input.kind);
  if (!name.success) return fail(name.error.issues[0].message);
  if (!kind.success) return fail();

  const { supabase } = await requireUser();
  const data = await listWorkoutData();
  const same = data.exercises.find((e) => e.name.toLocaleLowerCase("pt-BR") === name.data.toLocaleLowerCase("pt-BR"));
  if (same && !same.archivedAt) return fail(NAME_TAKEN);

  const result = await resolveExercise(supabase, data, { name: name.data, kind: kind.data });
  if (!result.ok) return result;

  refresh();
  return { ok: true, id: result.id };
}

/** Nome, tipo ou meta (um por vez, como a tarefa). */
export async function updateExercise(id: string, patch: ExercisePatch): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  const parsed = exercisePatchSchema.safeParse(patch);
  if (!parsedId.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const row: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) row.name = parsed.data.name;
  if (parsed.data.kind !== undefined) row.kind = parsed.data.kind;
  if (parsed.data.goal !== undefined) row.goal = parsed.data.goal;

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_exercises").update(row).eq("id", parsedId.data);
  if (error) return fail(error.code === UNIQUE ? NAME_TAKEN : GENERIC_ERROR);

  refresh();
  return { ok: true };
}

/** Guardar tira da lista de escolha e das fichas; o histórico fica. Voltar devolve à lista. */
export async function setExerciseArchived(id: string, archived: boolean): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("workout_exercises")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", parsedId.data);
  if (error) return fail();
  if (archived) {
    const { error: itemsError } = await supabase.from("workout_plan_items").delete().eq("exercise_id", parsedId.data);
    if (itemsError) return fail();
  }

  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------
// Fichas
// ------------------------------------------------------------------

async function nextPlanPosition(): Promise<number> {
  const data = await listWorkoutData();
  return sortPlans(data.plans).reduce((max, p) => Math.max(max, p.position + 1), 0);
}

/** Ficha vazia (os exercícios entram na página dela). */
export async function createPlan(name: string): Promise<CreateResult> {
  const parsed = planNameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({ name: parsed.data, position: await nextPlanPosition() })
    .select("id")
    .single();
  if (error) return fail();

  refresh();
  return { ok: true, id: data.id };
}

/** "Salvar como ficha": os exercícios do treino, na mesma ordem (concluído: só os feitos). */
export async function createPlanFromWorkout(sessionId: string, name: string): Promise<CreateResult> {
  const parsedId = workoutIdSchema.safeParse(sessionId);
  const parsedName = planNameSchema.safeParse(name);
  if (!parsedId.success) return fail();
  if (!parsedName.success) return fail(parsedName.error.issues[0].message);

  const { supabase } = await requireUser();
  const data = await listWorkoutData();
  const session = data.sessions.find((s) => s.id === parsedId.data);
  if (!session) return fail(GONE);
  const entries: WorkoutEntry[] = entriesOf(session.id, data).filter((e) => !session.finishedAt || e.done);
  if (entries.length === 0) return fail("Adicione exercícios ao treino antes de salvar como ficha.");

  const { data: plan, error } = await supabase
    .from("workout_plans")
    .insert({ name: parsedName.data, position: await nextPlanPosition() })
    .select("id")
    .single();
  if (error) return fail();
  const { error: itemsError } = await supabase
    .from("workout_plan_items")
    .insert(entries.map((e, position) => ({ plan_id: plan.id, exercise_id: e.exerciseId, position })));
  if (itemsError) {
    await supabase.from("workout_plans").delete().eq("id", plan.id);
    return fail();
  }

  refresh();
  return { ok: true, id: plan.id };
}

export async function renamePlan(id: string, name: string): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  const parsed = planNameSchema.safeParse(name);
  if (!parsedId.success) return fail();
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_plans").update({ name: parsed.data }).eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Os treinos feitos com ela continuam (sem a ligação). */
export async function deletePlan(id: string): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_plans").delete().eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

export async function addPlanItem(planId: string, target: ExerciseTarget): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(planId);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const data = await listWorkoutData();
  if (!data.plans.some((p) => p.id === parsedId.data)) return fail("Essa ficha não existe mais.");
  const exercise = await resolveExercise(supabase, data, target);
  if (!exercise.ok) return exercise;

  const items = data.planItems.filter((i) => i.planId === parsedId.data);
  if (items.some((i) => i.exerciseId === exercise.id)) return { ok: true };
  const { error } = await supabase.from("workout_plan_items").insert({
    plan_id: parsedId.data,
    exercise_id: exercise.id,
    position: items.reduce((max, i) => Math.max(max, i.position + 1), 0),
  });
  if (error && error.code !== UNIQUE) return fail();

  refresh();
  return { ok: true };
}

export async function removePlanItem(id: string): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  if (!parsedId.success) return fail();

  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_plan_items").delete().eq("id", parsedId.data);
  if (error) return fail();

  refresh();
  return { ok: true };
}

/** Sobe (−1) ou desce (+1) um exercício na ficha. */
export async function movePlanItem(id: string, direction: -1 | 1): Promise<ActionResult> {
  const parsedId = workoutIdSchema.safeParse(id);
  if (!parsedId.success || (direction !== -1 && direction !== 1)) return fail();

  const { supabase } = await requireUser();
  const data = await listWorkoutData();
  const item = data.planItems.find((i) => i.id === parsedId.data);
  if (!item) return fail();
  const order = data.planItems.filter((i) => i.planId === item.planId).sort((a, b) => a.position - b.position);
  const from = order.findIndex((i) => i.id === item.id);
  const to = from + direction;
  if (to < 0 || to >= order.length) return { ok: true };
  [order[from], order[to]] = [order[to], order[from]];

  const changed = order.flatMap((i, position) => (i.position === position ? [] : [{ id: i.id, position }]));
  const results = await Promise.all(changed.map((c) => supabase.from("workout_plan_items").update({ position: c.position }).eq("id", c.id)));
  if (results.some((r) => r.error)) return fail();

  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------
// Meta da semana
// ------------------------------------------------------------------

/** Treinos por semana (1 a 7) ou sem meta (null). */
export async function setWeeklyGoal(goal: number | null): Promise<ActionResult> {
  const parsed = weeklyGoalSchema.safeParse(goal);
  if (!parsed.success) return fail();

  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("workout_settings").upsert({ user_id: userId, weekly_goal: parsed.data }, { onConflict: "user_id" });
  if (error) return fail();

  refresh();
  return { ok: true };
}
