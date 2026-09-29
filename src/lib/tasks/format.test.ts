import { describe, expect, it } from "vitest";
import { formatDuration, pendingLabel, searchTerm } from "./format";

describe("formatDuration", () => {
  it.each([
    [5, "5 min"],
    [45, "45 min"],
    [60, "1 h"],
    [90, "1 h 30"],
    [120, "2 h"],
  ])("%i → %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("pendingLabel", () => {
  it("singular, plural e vazio", () => {
    expect(pendingLabel(0)).toBeNull();
    expect(pendingLabel(1)).toBe("Você tem 1 pendência.");
    expect(pendingLabel(8)).toBe("Você tem 8 pendências.");
  });
});

describe("searchTerm", () => {
  it("tira o que quebraria o filtro e junta espaços", () => {
    expect(searchTerm("  orçamento, (embalagens)  ")).toBe("orçamento embalagens");
    expect(searchTerm('100% "certo"_*')).toBe("100 certo");
    expect(searchTerm("%%")).toBe("");
  });
});
