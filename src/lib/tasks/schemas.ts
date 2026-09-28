import { z } from "zod";
import { ENERGY_LEVELS, TASK_STATUSES, type Task } from "@/types/task";

export const taskIdSchema = z.uuid();

export const captureSchema = z.object({
  title: z.string().trim().min(1, "Escreva algo para capturar.").max(500),
});

export const updateTaskSchema = z.object({
  id: taskIdSchema,
  title: z.string().trim().min(1, "A tarefa precisa de um título.").max(500),
  description: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => (v === "" ? null : v)),
});

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
    }),
  );

export const TASK_COLUMNS =
  "id, title, description, status, importance, urgency, energy, estimated_minutes, due_date, project_id, area_id, created_at, updated_at, completed_at";
