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

  it("rejeita valores fora da escala, datas inválidas e patch vazio", () => {
    expect(taskPatchSchema.safeParse({ importance: 7 }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ dueDate: "amanhã" }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ estimatedMinutes: 0 }).success).toBe(false);
    expect(taskPatchSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(taskPatchSchema.safeParse({}).success).toBe(false);
  });
});
