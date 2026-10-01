"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { addDays, todayIn } from "@/lib/dates";
import type { TaskStatus } from "@/types/task";
import type { ActionFailure } from "@/lib/actions/resilient";
import { payPromptFor } from "@/lib/dinheiro/links";
import {
  patchToRow,
  queuedCaptureSchema,
  queuedCaptureToRow,
  setStatusSchema,
  taskIdSchema,
  taskPatchSchema,
  type QueuedCapture,
  type TaskPatch,
} from "./schemas";

export type ActionResult = { ok: true } | ActionFailure;

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";

/** Postgres: violação de unicidade — aqui, a captura já tinha chegado antes. */
const ALREADY_SAVED = "23505";

/** Captura rápida: só o título. Entra direto em A fazer. Pode ser reenviada sem duplicar (id vem do aparelho). */
export async function captureTask(capture: QueuedCapture): Promise<ActionResult> {
  const parsed = queuedCaptureSchema.safeParse(capture);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").insert(queuedCaptureToRow(parsed.data));
  if (error && error.code !== ALREADY_SAVED) return { ok: false, error: GENERIC_ERROR, retry: true };

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
/**
 * Resultado de mudar o status. `payPrompt`: a tarefa concluída paga algo do Dinheiro que
 * ainda não está pago — o app pergunta se quer marcar como paga.
 */
export type StatusResult = { ok: true; payPrompt?: string } | ActionFailure;

export async function setTaskStatus(id: string, status: TaskStatus): Promise<StatusResult> {
  const parsed = setStatusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  const payPrompt = parsed.data.status === "DONE" ? await payPromptFor(supabase, parsed.data.id) : null;

  refresh();
  return payPrompt ? { ok: true, payPrompt } : { ok: true };
}

/** Pausar: para de fazer sem concluir. Volta para A fazer, marcada como pausada (Retomar = começar de novo). */
export async function pauseTask(id: string): Promise<ActionResult> {
  const parsedId = taskIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "TODO", paused_at: new Date().toISOString() })
    .eq("id", parsedId.data);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

/** "Agora não": sai da Agora, fica em A fazer e volta sozinha amanhã. `false` desfaz. */
export async function snoozeTask(id: string, snooze = true): Promise<ActionResult> {
  const parsedId = taskIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ snoozed_until: snooze ? addDays(todayIn(), 1) : null })
    .eq("id", parsedId.data);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}
