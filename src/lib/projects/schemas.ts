import { z } from "zod";
import { MODULE_KEYS, PROJECT_STATUSES, type Area, type AreaLink, type Project } from "@/types/project";

export const idSchema = z.uuid();

export const areaNameSchema = z.string().trim().min(1, "Dê um nome.").max(80);
const projectName = z.string().trim().min(1, "Dê um nome para o projeto.").max(120);

/** O objetivo (coluna description); vazio vira null. */
const projectGoal = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => (v === "" ? null : v));

export const createProjectSchema = z.object({
  name: projectName,
  areaId: idSchema.nullable(),
  dueDate: z.iso.date().nullable(),
  description: projectGoal.optional(),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;

/** Patch parcial do projeto (salvamento automático, um campo por vez). */
export const projectPatchSchema = z
  .object({
    name: projectName,
    description: projectGoal,
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
    paused_at: z.string().nullable(),
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
      pausedAt: r.paused_at,
    }),
  );

export const PROJECT_COLUMNS = "id, name, description, status, area_id, due_date, created_at, completed_at, paused_at";

export const AREA_COLUMNS = "id, name, parent_id, module, position, archived_at";

export const areaRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable(),
    module: z.enum(MODULE_KEYS),
    position: z.number(),
    archived_at: z.string().nullable(),
  })
  .transform(
    (r): Area => ({ id: r.id, name: r.name, parentId: r.parent_id, module: r.module, position: r.position, archivedAt: r.archived_at }),
  );

export const areaLinkRowSchema = z
  .object({ id: z.string(), title: z.string(), url: z.string() })
  .transform((r): AreaLink => r);

/** Link de contexto. Sem "https://" na frente, completa sozinho. */
export const linkInputSchema = z.object({
  title: z.string().trim().min(1, "Dê um nome para o link.").max(120),
  url: z
    .string()
    .trim()
    .min(1, "Cole o endereço do link.")
    .max(2000)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.url({ protocol: /^https?$/, error: "Esse link não parece válido." })),
});

export type LinkInput = z.input<typeof linkInputSchema>;

/** Anotação livre do contexto (origem ou projeto); vazia vira null. */
export const areaNotesSchema = z
  .string()
  .max(20000, "Anotação longa demais.")
  .transform((v) => (v.trim() === "" ? null : v));
