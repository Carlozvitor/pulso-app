import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { newCapture, parseQueue, uuid, withCapture, withoutCapture } from "./capture-queue";

const a = { id: "a", title: "Comprar remédio", capturedAt: "2026-09-29T10:00:00.000Z" };
const b = { id: "b", title: "Ligar pro banco", capturedAt: "2026-09-29T10:05:00.000Z" };

describe("parseQueue", () => {
  it("fila vazia ou ilegível vira lista vazia", () => {
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue("")).toEqual([]);
    expect(parseQueue("{quebrado")).toEqual([]);
    expect(parseQueue('{"id":"a"}')).toEqual([]);
  });

  it("ignora só o item estragado e mantém o resto", () => {
    expect(parseQueue(JSON.stringify([a, { id: 1 }, b]))).toEqual([a, b]);
  });
});

describe("withCapture / withoutCapture", () => {
  it("adiciona no fim sem duplicar o mesmo id", () => {
    expect(withCapture([a], b)).toEqual([a, b]);
    expect(withCapture([a, b], a)).toEqual([a, b]);
  });

  it("tira pelo id", () => {
    expect(withoutCapture([a, b], "a")).toEqual([b]);
    expect(withoutCapture([a], "x")).toEqual([a]);
  });
});

describe("newCapture", () => {
  it("limpa o título e registra a hora da captura", () => {
    const now = new Date("2026-09-29T10:00:00.000Z");
    expect(newCapture("  Comprar remédio ", now, () => "a")).toEqual(a);
  });
});

describe("uuid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gera UUID v4 válido mesmo sem crypto.randomUUID (http na rede local)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (arr: Uint8Array) => real.getRandomValues(arr) });
    const ids = new Set(Array.from({ length: 50 }, () => uuid()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(z.uuidv4().safeParse(id).success).toBe(true);
  });
});
