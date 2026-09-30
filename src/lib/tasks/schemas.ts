import { z } from "zod";
import { ENERGY_LEVELS, TASK_STATUSES, type Task } from "@/types/task";

export const taskIdSchema = z.uuid();

export const captureSchema = z.object({
  title: z.string().trim().min(1, "Escreva algo para capturar.").max(500),
});

/**
 * Captura rápida (+): passa pela fila do aparelho antes de ir ao servidor.
 * O id nasce no celular — reenviar a mesma captura nunca cria tarefa duplicada.
 */
export const queuedCaptureSchema = captureSchema.extend({
  id: taskIdSchema,
  capturedAt: z.iso.datetime({ offset: true }),
});

export type QueuedCapture = z.input<typeof queuedCaptureSchema>;

/** Guarda a hora real da captura (pode ter sido offline), mas nunca uma hora no futuro. */
export function queuedCaptureToRow(capture: z.output<typeof queuedCaptureSchema>, now = new Date()) {
  const capturedAt = new Date(capture.capturedAt);
  const createdAt = capturedAt > now ? now : capturedAt;
  // Anotou, já é tarefa a fazer (a Inbox deixou de ser etapa obrigatória).
  return { id: capture.id, title: capture.title, status: "TODO" as const, created_at: createdAt.toISOString() };
}

const scaleField = z.number().int().min(0).max(5).nullable();

/** Patch parcial: só os campos enviados são alterados (salvamento automático). */
export const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1, "A tarefa precisa de um título.").max(500),
    description: z
      .string()
      .trim()
      .max(5000)
      .transform((v) => (v === "" ? null : v)),
    importance: scaleField,
    urgency: scaleField,
    energy: z.enum(ENERGY_LEVELS).nullable(),
    estimatedMinutes: z.number().int().min(1).max(1440).nullable(),
    dueDate: z.iso.date().nullable(),
    /** A área passa a vir do projeto (trigger no banco). */
    projectId: taskIdSchema.nullable(),
    /** Só vale para tarefa sem projeto. */
    areaId: taskIdSchema.nullable(),
    /** Aqui só desliga da avaliação; ligar é pela gaveta da avaliação. */
    assessmentId: z.null(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Nada para salvar.");

export type TaskPatch = z.input<typeof taskPatchSchema>;

/** camelCase do app → colunas do banco. */
export function patchToRow(patch: z.output<typeof taskPatchSchema>) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.importance !== undefined) row.importance = patch.importance;
  if (patch.urgency !== undefined) row.urgency = patch.urgency;
  if (patch.energy !== undefined) row.energy = patch.energy;
  if (patch.estimatedMinutes !== undefined) row.estimated_minutes = patch.estimatedMinutes;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  if (patch.areaId !== undefined) row.area_id = patch.areaId;
  if (patch.assessmentId !== undefined) row.assessment_id = patch.assessmentId;
  return row;
}

export const setStatusSchema = z.object({
  id: taskIdSchema,
  status: z.enum(TASK_STATUSES),
});

const scale = z.number().int().min(0).max(5);

/** Linha da tabela tasks (snake_case) → Task do app. */
export const taskRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.enum(TASK_STATUSES),
    importance: scale.nullable(),
    urgency: scale.nullable(),
    energy: z.enum(ENERGY_LEVELS).nullable(),
    estimated_minutes: z.number().int().nullable(),
    due_date: z.string().nullable(),
    project_id: z.string().nullable(),
    area_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    completed_at: z.string().nullable(),
    paused_at: z.string().nullable(),
    snoozed_until: z.string().nullable(),
    assessment_id: z.string().nullable(),
  })
  .transform(
    (r): Task => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      importance: r.importance as Task["importance"],
      urgency: r.urgency as Task["urgency"],
      energy: r.energy,
      estimatedMinutes: r.estimated_minutes,
      dueDate: r.due_date,
      projectId: r.project_id,
      areaId: r.area_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      completedAt: r.completed_at,
      pausedAt: r.paused_at,
      snoozedUntil: r.snoozed_until,
      assessmentId: r.assessment_id,
    }),
  );

export const TASK_COLUMNS =
  "id, title, description, status, importance, urgency, energy, estimated_minutes, due_date, project_id, area_id, created_at, updated_at, completed_at, paused_at, snoozed_until, assessment_id";
