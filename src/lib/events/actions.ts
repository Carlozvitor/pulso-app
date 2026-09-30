"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/tasks/actions";
import { EVENT_COLUMNS, eventIdSchema, eventInputSchema, eventInputToRow, eventRowSchema, type EventInput } from "./schemas";

const GENERIC_ERROR = "Não deu para salvar agora. Tente de novo.";

/**
 * Num compromisso que se repete: "all" mexe na regra inteira; "only" mexe só na ocorrência
 * daquele dia (ela sai da repetição e, se for edição, vira um compromisso avulso).
 */
export type EventScope = { kind: "all" } | { kind: "only"; date: string };

const scopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("only"), date: z.iso.date() }),
]);

function firstIssue(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0].message };
}

export async function createEvent(input: EventInput): Promise<ActionResult> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const { supabase } = await requireUser();
  const { error } = await supabase.from("events").insert(eventInputToRow(parsed.data));
  if (error) return { ok: false, error: GENERIC_ERROR };

  refresh();
  return { ok: true };
}

/** Tira um dia da repetição (sem duplicar). */
async function skipDate(id: string, date: string): Promise<boolean> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return false;
  const event = eventRowSchema.parse(data);
  if (event.skippedDates.includes(date)) return true;
  const { error: updateError } = await supabase
    .from("events")
    .update({ skipped_dates: [...event.skippedDates, date] })
    .eq("id", id);
  return !updateError;
}

export async function updateEvent(id: string, input: EventInput, scope: EventScope = { kind: "all" }): Promise<ActionResult> {
  const parsedId = eventIdSchema.safeParse(id);
  const parsedScope = scopeSchema.safeParse(scope);
  const parsed = eventInputSchema.safeParse(input);
  if (!parsedId.success || !parsedScope.success) return { ok: false, error: GENERIC_ERROR };
  if (!parsed.success) return firstIssue(parsed.error);

  const { supabase } = await requireUser();

  if (parsedScope.data.kind === "all") {
    const { error } = await supabase.from("events").update(eventInputToRow(parsed.data)).eq("id", parsedId.data);
    if (error) return { ok: false, error: GENERIC_ERROR };
  } else {
    // "Só este": cria o avulso primeiro; se tirar o dia da repetição falhar, desfaz — nunca some nem duplica.
    const single = { ...eventInputToRow(parsed.data), repeat_days: null, repeat_until: null };
    const { data, error } = await supabase.from("events").insert(single).select("id").single();
    if (error) return { ok: false, error: GENERIC_ERROR };
    if (!(await skipDate(parsedId.data, parsedScope.data.date))) {
      await supabase.from("events").delete().eq("id", data.id);
      return { ok: false, error: GENERIC_ERROR };
    }
  }

  refresh();
  return { ok: true };
}

export async function deleteEvent(id: string, scope: EventScope = { kind: "all" }): Promise<ActionResult> {
  const parsedId = eventIdSchema.safeParse(id);
  const parsedScope = scopeSchema.safeParse(scope);
  if (!parsedId.success || !parsedScope.success) return { ok: false, error: GENERIC_ERROR };

  if (parsedScope.data.kind === "only") {
    if (!(await skipDate(parsedId.data, parsedScope.data.date))) return { ok: false, error: GENERIC_ERROR };
  } else {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("events").delete().eq("id", parsedId.data);
    if (error) return { ok: false, error: GENERIC_ERROR };
  }

  refresh();
  return { ok: true };
}
