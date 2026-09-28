"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { TaskStatus } from "@/types/task";
import { captureSchema, patchToRow, setStatusSchema, taskIdSchema, taskPatchSchema, type TaskPatch } from "./schemas";

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

/** Altera só os campos enviados (título, descrição, importância, prazo…). */
export async function updateTask(id: string, patch: TaskPatch): Promise<ActionResult> {
  const parsedId = taskIdSchema.safeParse(id);
  const parsed = taskPatchSchema.safeParse(patch);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").update(patchToRow(parsed.data)).eq("id", parsedId.data);
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
