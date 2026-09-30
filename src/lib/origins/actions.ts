"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { captureSchema } from "@/lib/tasks/schemas";
import type { ActionResult } from "@/lib/tasks/actions";
import type { CreateResult } from "@/lib/projects/actions";
import { areaNameSchema, areaNotesSchema, idSchema, linkInputSchema, type LinkInput } from "@/lib/projects/schemas";

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";

/** Postgres: regra da árvore (gatilho) e subitem ainda pendurado (chave estrangeira). */
const TREE_RULE = "23514";
const HAS_CHILDREN = "23503";

function failure(error: { code?: string; message: string }): { ok: false; error: string } {
  if (error.code === TREE_RULE) return { ok: false, error: error.message };
  if (error.code === HAS_CHILDREN && error.message.includes("assessments_area_fk")) {
    return { ok: false, error: "Tem avaliações aqui. Apague as avaliações antes, ou encerre a disciplina." };
  }
  if (error.code === HAS_CHILDREN) return { ok: false, error: "Esvazie os subitens antes de apagar." };
  return { ok: false, error: GENERIC_ERROR };
}

// ── Árvore ──────────────────────────────────────────────────

/** Subitem novo no fim da lista do pai. O módulo vem do pai (gatilho no banco). */
export async function createOrigin(parentId: string, name: string): Promise<CreateResult> {
  const parsedParent = idSchema.safeParse(parentId);
  const parsed = areaNameSchema.safeParse(name);
  if (!parsedParent.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { data: last } = await supabase
    .from("areas")
    .select("position")
    .eq("parent_id", parsedParent.data)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("areas")
    .insert({ parent_id: parsedParent.data, name: parsed.data, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error) return failure(error);

  refresh();
  return { ok: true, id: data.id };
}

export async function renameOrigin(id: string, name: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = areaNameSchema.safeParse(name);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  // Módulos (raízes) têm nome fixo.
  const { error } = await supabase.from("areas").update({ name: parsed.data }).eq("id", parsedId.data).not("parent_id", "is", null);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

/** Muda de lugar dentro do mesmo módulo; vai para o fim da lista do novo pai. */
export async function moveOrigin(id: string, parentId: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsedParent = idSchema.safeParse(parentId);
  if (!parsedId.success || !parsedParent.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { data: last } = await supabase
    .from("areas")
    .select("position")
    .eq("parent_id", parsedParent.data)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("areas")
    .update({ parent_id: parsedParent.data, position: (last?.position ?? -1) + 1 })
    .eq("id", parsedId.data);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

/** Tarefas e projetos do item ficam sem origem; links vão junto. Com subitens, o banco recusa. */
export async function deleteOrigin(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("areas").delete().eq("id", parsedId.data);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

// ── Contexto ────────────────────────────────────────────────

export async function saveOriginNotes(id: string, notes: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = areaNotesSchema.safeParse(notes);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("areas")
    .update({ notes: parsed.data, notes_updated_at: new Date().toISOString() })
    .eq("id", parsedId.data);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

export async function addOriginLink(areaId: string, input: LinkInput): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(areaId);
  const parsed = linkInputSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("area_links").insert({ area_id: parsedId.data, ...parsed.data });
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

export async function removeOriginLink(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("area_links").delete().eq("id", parsedId.data);
  if (error) return failure(error);

  refresh();
  return { ok: true };
}

/** Ação criada dentro de um item já tem origem: entra direto em "A fazer". */
export async function createOriginTask(areaId: string, title: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(areaId);
  const parsed = captureSchema.safeParse({ title });
  if (!parsedId.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").insert({ title: parsed.data.title, area_id: parsedId.data, status: "TODO" });
  if (error) return failure(error);

  refresh();
  return { ok: true };
}
