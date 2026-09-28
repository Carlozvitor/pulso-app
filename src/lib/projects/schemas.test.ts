import { describe, expect, it } from "vitest";
import { areaNameSchema, createProjectSchema, projectPatchSchema, projectPatchToRow } from "./schemas";

const UUID = "0b8f3c3e-6a2d-4f7e-9b1a-2c4d5e6f7a8b";

describe("createProjectSchema", () => {
  it("só o nome é obrigatório", () => {
    expect(createProjectSchema.parse({ name: "  Portfólio ", areaId: null, dueDate: null }).name).toBe("Portfólio");
    expect(createProjectSchema.safeParse({ name: "  ", areaId: null, dueDate: null }).success).toBe(false);
  });

  it("rejeita área que não é uuid e data inválida", () => {
    expect(createProjectSchema.safeParse({ name: "X", areaId: "trabalho", dueDate: null }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "X", areaId: UUID, dueDate: "sexta" }).success).toBe(false);
  });
});

describe("projectPatchSchema", () => {
  it("converte para colunas; descrição vazia vira null", () => {
    const parsed = projectPatchSchema.parse({ areaId: UUID, description: "  " });
    expect(projectPatchToRow(parsed)).toEqual({ area_id: UUID, description: null });
  });

  it("rejeita patch vazio", () => {
    expect(projectPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe("areaNameSchema", () => {
  it("limpa espaços e limita a 80", () => {
    expect(areaNameSchema.parse(" Finanças ")).toBe("Finanças");
    expect(areaNameSchema.safeParse("").success).toBe(false);
    expect(areaNameSchema.safeParse("x".repeat(81)).success).toBe(false);
  });
});
