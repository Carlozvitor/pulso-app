import { describe, expect, it } from "vitest";
import { patchToRow, taskPatchSchema } from "./schemas";

describe("taskPatchSchema", () => {
  it("aceita patch de um campo só e converte para colunas", () => {
    const parsed = taskPatchSchema.parse({ estimatedMinutes: 25 });
    expect(patchToRow(parsed)).toEqual({ estimated_minutes: 25 });
  });

  it("null limpa o campo; descrição vazia vira null", () => {
    const parsed = taskPatchSchema.parse({ dueDate: null, description: "   " });
    expect(patchToRow(parsed)).toEqual({ due_date: null, description: null });
  });

  it("projeto e área viram colunas; null tira do projeto", () => {
    const id = "0b8f3c3e-6a2d-4f7e-9b1a-2c4d5e6f7a8b";
    expect(patchToRow(taskPatchSchema.parse({ projectId: id }))).toEqual({ project_id: id });
    expect(patchToRow(taskPatchSchema.parse({ projectId: null }))).toEqual({ project_id: null });
    expect(patchToRow(taskPatchSchema.parse({ areaId: id }))).toEqual({ area_id: id });
    expect(taskPatchSchema.safeParse({ projectId: "crumb" }).success).toBe(false);
  });

  it("rejeita valores fora da escala, datas inválidas e patch vazio", () => {
    expect(taskPatchSchema.safeParse({ importance: 7 }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ dueDate: "amanhã" }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ estimatedMinutes: 0 }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(taskPatchSchema.safeParse({}).success).toBe(false);
  });
});
