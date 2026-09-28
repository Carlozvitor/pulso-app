import { z } from "zod";
import { PROJECT_STATUSES, type Area, type Project } from "@/types/project";

export const idSchema = z.uuid();

export const areaNameSchema = z.string().trim().min(1, "Dê um nome para a área.").max(80);
const projectName = z.string().trim().min(1, "Dê um nome para o projeto.").max(120);

export const createProjectSchema = z.object({
  name: projectName,
  areaId: idSchema.nullable(),
  dueDate: z.iso.date().nullable(),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;

/** Patch parcial do projeto (salvamento automático, um campo por vez). */
export const projectPatchSchema = z
  .object({
    name: projectName,
    description: z
      .string()
      .trim()
      .max(2000)
      .transform((v) => (v === "" ? null : v)),
    areaId: idSchema.nullable(),
    dueDate: z.iso.date().nullable(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Nada para salvar.");

export type ProjectPatch = z.input<typeof projectPatchSchema>;

export function projectPatchToRow(patch: z.output<typeof projectPatchSchema>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.areaId !== undefined) row.area_id = patch.areaId;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  return row;
}

export const projectRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.enum(PROJECT_STATUSES),
    area_id: z.string().nullable(),
    due_date: z.string().nullable(),
    created_at: z.string(),
    completed_at: z.string().nullable(),
  })
  .transform(
    (r): Project => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      areaId: r.area_id,
      dueDate: r.due_date,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    }),
  );

export const PROJECT_COLUMNS = "id, name, description, status, area_id, due_date, created_at, completed_at";

export const areaRowSchema = z.object({ id: z.string(), name: z.string() }).transform((r): Area => r);
