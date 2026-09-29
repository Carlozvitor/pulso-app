import { describe, expect, it } from "vitest";
import { proposalHref, sessionParamsSchema, startSessionSchema } from "./schemas";

const A = "0b8f3c3e-6a2d-4f7e-9b1a-2c4d5e6f7a8b";
const B = "1c9a4d4f-7b3e-4a8f-8c2b-3d5e6f7a8b9c";

describe("sessionParamsSchema", () => {
  it("lê tempo, energia e as recusadas da URL", () => {
    expect(sessionParamsSchema.parse({ min: "30", energia: "LOW", pular: `${A},${B}` })).toEqual({
      min: 30,
      energia: "LOW",
      pular: [A, B],
    });
  });

  it("ignora ids inválidos em 'pular' e aceita sem 'pular'", () => {
    expect(sessionParamsSchema.parse({ min: "10", energia: "HIGH", pular: `lixo,${A}` }).pular).toEqual([A]);
    expect(sessionParamsSchema.parse({ min: "10", energia: "HIGH" }).pular).toEqual([]);
  });

  it("rejeita tempo fora da faixa e energia desconhecida", () => {
    expect(sessionParamsSchema.safeParse({ min: "2", energia: "LOW" }).success).toBe(false);
    expect(sessionParamsSchema.safeParse({ min: "600", energia: "LOW" }).success).toBe(false);
    expect(sessionParamsSchema.safeParse({ min: "abc", energia: "LOW" }).success).toBe(false);
    expect(sessionParamsSchema.safeParse({ min: "30", energia: "MUITA" }).success).toBe(false);
  });
});

describe("proposalHref", () => {
  it("monta a URL que o schema entende de volta", () => {
    const href = proposalHref({ minutes: 20, energy: "MEDIUM" }, [A]);
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(sessionParamsSchema.parse(params)).toEqual({ min: 20, energia: "MEDIUM", pular: [A] });
    expect(proposalHref({ minutes: 20, energy: "MEDIUM" })).toBe("/sessao?min=20&energia=MEDIUM");
  });
});

describe("startSessionSchema", () => {
  it("exige de 1 a 5 tarefas", () => {
    expect(startSessionSchema.safeParse({ minutes: 30, energy: "LOW", taskIds: [] }).success).toBe(false);
    expect(startSessionSchema.safeParse({ minutes: 30, energy: "LOW", taskIds: [A] }).success).toBe(true);
    expect(startSessionSchema.safeParse({ minutes: 30, energy: "LOW", taskIds: Array(6).fill(A) }).success).toBe(false);
  });
});
