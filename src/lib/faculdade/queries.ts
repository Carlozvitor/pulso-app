import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import type { Assessment } from "@/types/assessment";
import { ASSESSMENT_COLUMNS, assessmentRowSchema } from "./schemas";

const assessmentRows = z.array(assessmentRowSchema);

/**
 * Todas as avaliações (volume de um semestre ou alguns). Em cache por requisição:
 * barra lateral, Central, Compromissos e Faculdade leem a mesma lista.
 */
export const listAssessments = cache(async function listAssessments(): Promise<Assessment[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("assessments").select(ASSESSMENT_COLUMNS);
  if (error) throw error;
  return assessmentRows.parse(data);
});
