"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/tasks/actions";
import { startSessionSchema, type StartSessionInput } from "./schemas";

const GENERIC_ERROR = "Não deu para começar agora. Tente de novo.";

/** Salva a sessão (e encerra qualquer outra que tenha ficado aberta). */
export async function startSession(input: StartSessionInput): Promise<ActionResult> {
  const parsed = startSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const { minutes, energy, taskIds } = parsed.data;

  const { supabase } = await requireUser();
  const now = new Date().toISOString();

  const { error: closeError } = await supabase.from("sessions").update({ ended_at: now }).is("ended_at", null);
  if (closeError) return { ok: false, error: GENERIC_ERROR };

  const { data, error } = await supabase
    .from("sessions")
    .insert({ available_minutes: minutes, energy_level: energy, started_at: now })
    .select("id")
    .single();
  if (error) return { ok: false, error: GENERIC_ERROR };

  const { error: linkError } = await supabase
    .from("session_tasks")
    .insert(taskIds.map((taskId, position) => ({ session_id: data.id, task_id: taskId, position })));
  if (linkError) {
    await supabase.from("sessions").delete().eq("id", data.id);
    return { ok: false, error: GENERIC_ERROR };
  }

  refresh();
  return { ok: true };
}

export async function endSession(id: string): Promise<ActionResult> {
  const END_ERROR = "Não deu para encerrar agora. Tente de novo.";
  if (!z.uuid().safeParse(id).success) return { ok: false, error: END_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id)
    .is("ended_at", null);
  if (error) return { ok: false, error: END_ERROR };

  refresh();
  return { ok: true };
}
