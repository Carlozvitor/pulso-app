"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { TaskStatus } from "@/types/task";
import { captureSchema, setStatusSchema, updateTaskSchema } from "./schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";

/** Captura rápida: só o título. Entra na Inbox. */
export async function captureTask(title: string): Promise<ActionResult> {
  const parsed = captureSchema.safeParse({ title });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").insert({ title: parsed.data.title });
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

export async function updateTask(input: { id: string; title: string; description: string }): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { id, ...fields } = parsed.data;
  const { error } = await supabase.from("tasks").update(fields).eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

/** Organizar (TODO), começar, concluir, arquivar ou reabrir. */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  const parsed = setStatusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}
