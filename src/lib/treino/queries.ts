import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import type { WorkoutData } from "@/types/workout";
import {
  ENTRY_COLUMNS,
  EXERCISE_COLUMNS,
  PLAN_COLUMNS,
  PLAN_ITEM_COLUMNS,
  SESSION_COLUMNS,
  entryRowSchema,
  exerciseRowSchema,
  planItemRowSchema,
  planRowSchema,
  sessionRowSchema,
} from "./schemas";

/** O banco devolve no máximo 1000 linhas por vez. */
const PAGE = 1000;

type Client = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** Uma tabela inteira, de 1000 em 1000 (registros passam disso em alguns meses de treino). */
async function allRows(supabase: Client, table: "workout_sessions" | "workout_entries", columns: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).order("id").range(offset, offset + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

/**
 * Tudo do Treino. Em cache por requisição: barra lateral, Central e a tela leem o mesmo;
 * evolução, frequência e "a última vez" são calculadas em memória (src/lib/treino/summary).
 */
export const listWorkoutData = cache(async function listWorkoutData(): Promise<WorkoutData> {
  const { supabase } = await requireUser();
  const [exercises, plans, items, settings, sessions, entries] = await Promise.all([
    supabase.from("workout_exercises").select(EXERCISE_COLUMNS),
    supabase.from("workout_plans").select(PLAN_COLUMNS),
    supabase.from("workout_plan_items").select(PLAN_ITEM_COLUMNS),
    supabase.from("workout_settings").select("weekly_goal").maybeSingle(),
    allRows(supabase, "workout_sessions", SESSION_COLUMNS),
    allRows(supabase, "workout_entries", ENTRY_COLUMNS),
  ]);
  for (const result of [exercises, plans, items, settings]) if (result.error) throw result.error;

  return {
    exercises: z.array(exerciseRowSchema).parse(exercises.data),
    plans: z.array(planRowSchema).parse(plans.data),
    planItems: z.array(planItemRowSchema).parse(items.data),
    sessions: z.array(sessionRowSchema).parse(sessions),
    entries: z.array(entryRowSchema).parse(entries),
    weeklyGoal: settings.data?.weekly_goal ?? null,
  };
});
