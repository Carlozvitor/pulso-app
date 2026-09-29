import { describe, expect, it } from "vitest";
import { loginHref, safeReturnPath } from "./return-path";

describe("safeReturnPath", () => {
  it("sem valor volta para a Agora", () => {
    expect(safeReturnPath(null)).toBe("/agora");
    expect(safeReturnPath("")).toBe("/agora");
  });

  it("aceita caminho interno com query", () => {
    expect(safeReturnPath("/tarefas/abc")).toBe("/tarefas/abc");
    expect(safeReturnPath("/sessao?min=20&energia=LOW")).toBe("/sessao?min=20&energia=LOW");
  });

  it("reduz URL completa (referer) a caminho + query", () => {
    expect(safeReturnPath("http://192.168.1.5:3000/projetos/x?a=1")).toBe("/projetos/x?a=1");
  });

  it("recusa destino externo ou esquisito", () => {
    expect(safeReturnPath("//evil.com")).toBe("/agora");
    expect(safeReturnPath("/\\evil.com")).toBe("/agora");
    expect(safeReturnPath("evil.com")).toBe("/agora");
    expect(safeReturnPath("javascript:alert(1)")).toBe("/agora");
  });

  it("nunca volta para o login nem para a raiz", () => {
    expect(safeReturnPath("/login")).toBe("/agora");
    expect(safeReturnPath("/login?volta=/inbox")).toBe("/agora");
    expect(safeReturnPath("/")).toBe("/agora");
  });
});

describe("loginHref", () => {
  it("leva o caminho junto quando vale a pena", () => {
    expect(loginHref("/tarefas/abc")).toBe("/login?volta=%2Ftarefas%2Fabc");
  });

  it("sem destino útil fica só /login", () => {
    expect(loginHref(null)).toBe("/login");
    expect(loginHref("/agora")).toBe("/login");
  });
});
