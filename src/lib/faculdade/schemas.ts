import { z } from "zod";
import { ASSESSMENT_KINDS, type Assessment } from "@/types/assessment";

export const ASSESSMENT_COLUMNS =
  "id, area_id, kind, title, due_date, due_time, location, max_grade, grade, notes, done_at, created_at";

export const assessmentIdSchema = z.uuid();

const title = z.string().trim().min(1, "Dê um nome para a avaliação.").max(200);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");

/** Duas casas, como no banco. */
const points = (min: number, message: string) =>
  z
    .number()
    .min(min, message)
    .max(1000, message)
    .transform((v) => Math.round(v * 100) / 100);

/** Nova avaliação: só tipo, título e disciplina são obrigatórios. */
export const assessmentInputSchema = z
  .object({
    areaId: z.uuid({ error: "Escolha a disciplina." }),
    kind: z.enum(ASSESSMENT_KINDS),
    title,
    dueDate: z.iso.date().nullable(),
    dueTime: time.nullable(),
    location: optionalText(200),
    maxGrade: points(0.01, "Valor inválido.").nullable(),
    notes: optionalText(5000),
  })
  // Sem data não tem horário.
  .transform((v) => ({ ...v, dueTime: v.dueDate ? v.dueTime : null }));

export type AssessmentInput = z.input<typeof assessmentInputSchema>;

/** Avaliação já criada: salva um campo por vez (como a tarefa). */
export const assessmentPatchSchema = z
  .object({
    areaId: z.uuid(),
    kind: z.enum(ASSESSMENT_KINDS),
    title,
    dueDate: z.iso.date().nullable(),
    dueTime: time.nullable(),
    location: optionalText(200),
    maxGrade: points(0.01, "Valor inválido.").nullable(),
    grade: points(0, "Nota inválida.").nullable(),
    notes: optionalText(5000),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Nada para salvar.");

export type AssessmentPatch = z.input<typeof assessmentPatchSchema>;

export function assessmentInputToRow(v: z.output<typeof assessmentInputSchema>) {
  return {
    area_id: v.areaId,
    kind: v.kind,
    title: v.title,
    due_date: v.dueDate,
    due_time: v.dueTime,
    location: v.location,
    max_grade: v.maxGrade,
    notes: v.notes,
  };
}

export function assessmentPatchToRow(patch: z.output<typeof assessmentPatchSchema>) {
  const row: Record<string, unknown> = {};
  if (patch.areaId !== undefined) row.area_id = patch.areaId;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.dueTime !== undefined) row.due_time = patch.dueTime;
  // Tirar a data tira o horário junto (o banco não aceita horário sem data).
  if (patch.dueDate === null) row.due_time = null;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.maxGrade !== undefined) row.max_grade = patch.maxGrade;
  if (patch.grade !== undefined) row.grade = patch.grade;
  if (patch.notes !== undefined) row.notes = patch.notes;
  return row;
}

// numeric do Postgres pode chegar como texto.
const numeric = z.union([z.number(), z.string()]).nullable().transform((v) => (v === null ? null : Number(v)));

export const assessmentRowSchema = z
  .object({
    id: z.string(),
    area_id: z.string(),
    kind: z.enum(ASSESSMENT_KINDS),
    title: z.string(),
    due_date: z.string().nullable(),
    // Postgres devolve "19:00:00".
    due_time: z.string().nullable(),
    location: z.string().nullable(),
    max_grade: numeric,
    grade: numeric,
    notes: z.string().nullable(),
    done_at: z.string().nullable(),
    created_at: z.string(),
  })
  .transform(
    (r): Assessment => ({
      id: r.id,
      areaId: r.area_id,
      kind: r.kind,
      title: r.title,
      dueDate: r.due_date,
      dueTime: r.due_time ? r.due_time.slice(0, 5) : null,
      location: r.location,
      maxGrade: r.max_grade,
      grade: r.grade,
      notes: r.notes,
      doneAt: r.done_at,
      createdAt: r.created_at,
    }),
  );
