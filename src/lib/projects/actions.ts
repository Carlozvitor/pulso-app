"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { captureSchema } from "@/lib/tasks/schemas";
import type { ActionResult } from "@/lib/tasks/actions";
import {
  areaNotesSchema,
  createProjectSchema,
  idSchema,
  linkInputSchema,
  projectPatchSchema,
  projectPatchToRow,
  type CreateProjectInput,
  type LinkInput,
  type ProjectPatch,
} from "./schemas";

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";

// ── Projetos ────────────────────────────────────────────────

export async function createProject(input: CreateProjectInput): Promise<CreateResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: parsed.data.name,
      area_id: parsed.data.areaId,
      due_date: parsed.data.dueDate,
      description: parsed.data.description ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true, id: data.id };
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = projectPatchSchema.safeParse(patch);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").update(projectPatchToRow(parsed.data)).eq("id", parsedId.data);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

/**
 * Pausar guarda o projeto: as ações dele continuam como estão, mas saem da Agora, do
 * A fazer, da Central e da sessão até retomar. A data da pausa vem do banco (gatilho).
 */
export async function pauseProject(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").update({ status: "PAUSED" }).eq("id", parsedId.data).eq("status", "ACTIVE");
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

/** Retomar: volta a andar e as ações reaparecem do jeito que estavam. */
export async function resumeProject(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").update({ status: "ACTIVE" }).eq("id", parsedId.data).eq("status", "PAUSED");
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

/**
 * Concluir ou arquivar (de em andamento ou de pausado): as tarefas ainda abertas vão
 * para o arquivo junto, para não seguirem aparecendo na Agora de um projeto que acabou.
 */
export async function finishProject(id: string, status: "DONE" | "ARCHIVED"): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success || (status !== "DONE" && status !== "ARCHIVED")) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .update({ status, completed_at: new Date().toISOString() })
    .eq("id", parsedId.data);
  if (error) return { ok: false, error: GENERIC_ERROR };

  const { error: tasksError } = await supabase
    .from("tasks")
    .update({ status: "ARCHIVED" })
    .eq("project_id", parsedId.data)
    .in("status", ["INBOX", "TODO", "IN_PROGRESS"]);
  if (tasksError) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

/** Volta a ser ativo. Tarefas arquivadas continuam no arquivo (dá para restaurar uma a uma). */
export async function reopenProject(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .update({ status: "ACTIVE", completed_at: null })
    .eq("id", parsedId.data);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

// ── Contexto: anotação e links ──────────────────────────────

export async function saveProjectNotes(id: string, notes: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = areaNotesSchema.safeParse(notes);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .update({ notes: parsed.data, notes_updated_at: new Date().toISOString() })
    .eq("id", parsedId.data);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

export async function addProjectLink(projectId: string, input: LinkInput): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(projectId);
  const parsed = linkInputSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("project_links").insert({ project_id: parsedId.data, ...parsed.data });
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

export async function removeProjectLink(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("project_links").delete().eq("id", parsedId.data);
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

// ── Ações do projeto ────────────────────────────────────────

/** Tarefa criada dentro do projeto já está organizada: entra direto como "A fazer". */
export async function createProjectTask(projectId: string, title: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(projectId);
  const parsed = captureSchema.safeParse({ title });
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .insert({ title: parsed.data.title, project_id: parsedId.data, status: "TODO" });
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}
