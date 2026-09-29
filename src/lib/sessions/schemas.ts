import { z } from "zod";
import { ENERGY_LEVELS, type Energy } from "@/types/task";

export const MINUTES_RANGE = { min: 5, max: 480 } as const;

const minutes = z.number().int().min(MINUTES_RANGE.min).max(MINUTES_RANGE.max);
const energy = z.enum(ENERGY_LEVELS);

/** Atalhos de tempo da escolha. */
export const SESSION_PRESETS = [10, 20, 30, 60] as const;

/** Na sessão a energia fala da pessoa, não da tarefa: "Normal" em vez de "Média". */
export const SESSION_ENERGY_LABEL: Record<Energy, string> = { LOW: "Baixa", MEDIUM: "Normal", HIGH: "Alta" };

/** Query string da proposta: ?min=30&energia=LOW&pular=id1,id2 */
export const sessionParamsSchema = z.object({
  min: z.coerce.number().pipe(minutes),
  energia: energy,
  pular: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter((id) => z.uuid().safeParse(id).success) : [])),
});

export const startSessionSchema = z.object({
  minutes,
  energy,
  taskIds: z.array(z.uuid()).min(1).max(5),
});

export type StartSessionInput = z.input<typeof startSessionSchema>;

export const sessionRowSchema = z
  .object({
    id: z.string(),
    started_at: z.string(),
    ended_at: z.string().nullable(),
    available_minutes: z.number().int(),
    energy_level: energy,
  })
  .transform((r) => ({
    id: r.id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    availableMinutes: r.available_minutes,
    energy: r.energy_level,
  }));

/** Monta a URL da proposta (usada na escolha e no "Agora não"). */
export function proposalHref(choice: { minutes: number; energy: Energy }, skipped: string[] = []): string {
  const params = new URLSearchParams({ min: String(choice.minutes), energia: choice.energy });
  if (skipped.length > 0) params.set("pular", skipped.join(","));
  return `/sessao?${params}`;
}
