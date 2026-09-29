import { afterEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { OFFLINE_ERROR, UNREACHABLE_ERROR, resilient } from "./resilient";

describe("resilient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("devolve o resultado da action quando dá certo", async () => {
    const action = resilient(async (n: number) => ({ ok: true as const, n }));
    await expect(action(2)).resolves.toEqual({ ok: true, n: 2 });
  });

  it("repassa falhas normais da action sem mexer", async () => {
    const action = resilient(async () => ({ ok: false as const, error: "Título vazio." }));
    await expect(action()).resolves.toEqual({ ok: false, error: "Título vazio." });
  });

  it("transforma erro de rede em falha com retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("navigator", { onLine: false });
    const action = resilient(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(action()).resolves.toEqual({ ok: false, error: OFFLINE_ERROR, retry: true });
  });

  it("com internet, a mensagem fala do servidor", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("navigator", { onLine: true });
    const action = resilient(async () => {
      throw new Error("500");
    });
    await expect(action()).resolves.toEqual({ ok: false, error: UNREACHABLE_ERROR, retry: true });
  });

  it("deixa o redirect do Next passar (sessão expirada)", async () => {
    const action = resilient(async () => {
      redirect("/login");
      return { ok: true as const };
    });
    await expect(action()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});
