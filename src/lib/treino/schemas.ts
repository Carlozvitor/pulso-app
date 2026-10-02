import { z } from "zod";
import { EXERCISE_KINDS, type WorkoutEntry, type WorkoutExercise, type WorkoutPlan, type WorkoutPlanItem, type WorkoutSession } from "@/types/workout";

export const EXERCISE_COLUMNS = "id, name, kind, goal, archived_at, created_at";
export const PLAN_COLUMNS = "id, name, position, created_at";
export const PLAN_ITEM_COLUMNS = "id, plan_id, exercise_id, position";
export const SESSION_COLUMNS = "id, date, plan_id, started_at, finished_at";
export const ENTRY_COLUMNS = "id, session_id, exercise_id, position, sets, reps, load_kg, minutes, done, created_at";

export const workoutIdSchema = z.uuid();

export const exerciseNameSchema = z.string().trim().min(1, "Dê um nome para o exercício.").max(80, "Nome comprido demais.");
export const planNameSchema = z.string().trim().min(1, "Dê um nome para a ficha.").max(60, "Nome comprido demais.");
export const exerciseKindSchema = z.enum(EXERCISE_KINDS);

/** Exercício escolhido da lista ou criado na hora (nome + tipo). */
export const exerciseTargetSchema = z.union([
  z.object({ exerciseId: workoutIdSchema }),
  z.object({ name: exerciseNameSchema, kind: exerciseKindSchema }),
]);
export type ExerciseTarget = z.input<typeof exerciseTargetSchema>;

/** Meta do exercício: kg, repetições ou minutos (duas casas, como no banco). */
const goal = z
  .number()
  .positive("Meta inválida.")
  .max(9999, "Meta inválida.")
  .transform((v) => Math.round(v * 100) / 100);

export const exercisePatchSchema = z
  .object({ name: exerciseNameSchema, kind: exerciseKindSchema, goal: goal.nullable() })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Nada para salvar.");
export type ExercisePatch = z.input<typeof exercisePatchSchema>;

const whole = (max: number, message: string) => z.number().int(message).min(1, message).max(max, message);

/** Números e "feito" de um exercício no treino (salva o que vier). */
export const entryPatchSchema = z
  .object({
    sets: whole(99, "Séries: use um número de 1 a 99.").nullable(),
    reps: whole(999, "Repetições: use um número de 1 a 999.").nullable(),
    loadKg: z
      .number()
      .positive("Carga: use um número maior que zero.")
      .max(9999, "Carga: use um número menor.")
      .transform((v) => Math.round(v * 100) / 100)
      .nullable(),
    minutes: whole(1440, "Minutos: use um número de 1 a 1440.").nullable(),
    done: z.boolean(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Nada para salvar.");
export type EntryPatch = z.input<typeof entryPatchSchema>;

export function entryPatchToRow(patch: z.output<typeof entryPatchSchema>) {
  const row: Record<string, unknown> = {};
  if (patch.sets !== undefined) row.sets = patch.sets;
  if (patch.reps !== undefined) row.reps = patch.reps;
  if (patch.loadKg !== undefined) row.load_kg = patch.loadKg;
  if (patch.minutes !== undefined) row.minutes = patch.minutes;
  if (patch.done !== undefined) row.done = patch.done;
  return row;
}

/** Como começar um treino: vazio, repetindo um anterior ou por uma ficha. */
export const startSchema = z.union([
  z.object({ from: z.literal("empty") }),
  z.object({ from: z.literal("session"), sessionId: workoutIdSchema }),
  z.object({ from: z.literal("plan"), planId: workoutIdSchema }),
]);
export type StartInput = z.input<typeof startSchema>;

export const weeklyGoalSchema = z.number().int().min(1).max(7).nullable();

// numeric do Postgres pode chegar como texto.
const numeric = z.union([z.number(), z.string()]).nullable().transform((v) => (v === null ? null : Number(v)));

export const exerciseRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(EXERCISE_KINDS),
    goal: numeric,
    archived_at: z.string().nullable(),
    created_at: z.string(),
  })
  .transform(
    (r): WorkoutExercise => ({ id: r.id, name: r.name, kind: r.kind, goal: r.goal, archivedAt: r.archived_at, createdAt: r.created_at }),
  );

export const planRowSchema = z
  .object({ id: z.string(), name: z.string(), position: z.number(), created_at: z.string() })
  .transform((r): WorkoutPlan => ({ id: r.id, name: r.name, position: r.position, createdAt: r.created_at }));

export const planItemRowSchema = z
  .object({ id: z.string(), plan_id: z.string(), exercise_id: z.string(), position: z.number() })
  .transform((r): WorkoutPlanItem => ({ id: r.id, planId: r.plan_id, exerciseId: r.exercise_id, position: r.position }));

export const sessionRowSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    plan_id: z.string().nullable(),
    started_at: z.string(),
    finished_at: z.string().nullable(),
  })
  .transform(
    (r): WorkoutSession => ({ id: r.id, date: r.date, planId: r.plan_id, startedAt: r.started_at, finishedAt: r.finished_at }),
  );

export const entryRowSchema = z
  .object({
    id: z.string(),
    session_id: z.string(),
    exercise_id: z.string(),
    position: z.number(),
    sets: z.number().nullable(),
    reps: z.number().nullable(),
    load_kg: numeric,
    minutes: z.number().nullable(),
    done: z.boolean(),
    created_at: z.string(),
  })
  .transform(
    (r): WorkoutEntry => ({
      id: r.id,
      sessionId: r.session_id,
      exerciseId: r.exercise_id,
      position: r.position,
      sets: r.sets,
      reps: r.reps,
      loadKg: r.load_kg,
      minutes: r.minutes,
      done: r.done,
      createdAt: r.created_at,
    }),
  );
