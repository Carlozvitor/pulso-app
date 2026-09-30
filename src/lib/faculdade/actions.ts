"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { CreateResult } from "@/lib/projects/actions";
import { idSchema } from "@/lib/projects/schemas";
import { captureSchema } from "@/lib/tasks/schemas";
import type { ActionResult } from "@/lib/tasks/actions";
import {
  assessmentIdSchema,
  assessmentInputSchema,
  assessmentInputToRow,
  assessmentPatchSchema,
  assessmentPatchToRow,
  type AssessmentInput,
  type AssessmentPatch,
} from "./schemas";

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";

/** Postgres: regra do gatilho (disciplina fora da Faculdade, módulo encerrado…). */
const RULE = "23514";

function failure(error: { code?: string; message: string }): { ok: false; error: string } {
  if (error.code === RULE && !error.message.includes("violates")) return { ok: false, error: error.message };
  return { ok: false, error: GENERIC_ERROR };
}

export async function createAssessment(input: AssessmentInput): Promise<CreateResult> {
  const parsed = assessmentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("assessments").insert(assessmentInputToRow(parsed.data)).select("id").single();
  if (error) return failure(error);

  refresh();
  return { ok: true, id: data.id };
}

/** Salva só os campos enviados (a gaveta salva um campo por vez). */
export async function updateAssessment(id: string, patch: AssessmentPatch): Promise<ActionResult> {
  const parsedId = assessmentIdSchema.safeParse(id);
  const parsed = assessmentPatchSchema.safeParse(patch);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("assessments").update(assessmentPatchToRow(parsed.data)).eq("id", parsedId.data);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

/** Entregue / feita (ou desfaz). Prova não usa: passa sozinha depois do dia. */
export async function setAssessmentDone(id: string, done: boolean): Promise<ActionResult> {
  const parsedId = assessmentIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("assessments")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", parsedId.data);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

/** As ações ligadas continuam no PULSO, na mesma disciplina (sem a ligação). */
export async function deleteAssessment(id: string): Promise<ActionResult> {
  const parsedId = assessmentIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("assessments").delete().eq("id", parsedId.data);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

/** Ação nova para uma avaliação: entra em "A fazer" com a disciplina como origem (gatilho no banco). */
export async function createAssessmentTask(assessmentId: string, title: string): Promise<ActionResult> {
  const parsedId = assessmentIdSchema.safeParse(assessmentId);
  const parsed = captureSchema.safeParse({ title });
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").insert({ title: parsed.data.title, assessment_id: parsedId.data, status: "TODO" });
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

/** Encerrar (fim do semestre) ou reabrir uma disciplina. Nada é apagado. */
export async function setSubjectArchived(id: string, archived: boolean): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("areas")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", parsedId.data)
    .eq("module", "FACULDADE")
    .not("parent_id", "is", null);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}
