import { describe, expect, it } from "vitest";
import { LEVEL_TO_SCALE, scaleToLevel } from "./levels";

describe("níveis ↔ escala 0–5", () => {
  it("ida e volta", () => {
    for (const level of ["LOW", "MEDIUM", "HIGH"] as const) {
      expect(scaleToLevel(LEVEL_TO_SCALE[level])).toBe(level);
    }
  });

  it("valores intermediários caem no nível mais próximo", () => {
    expect(scaleToLevel(0)).toBe("LOW");
    expect(scaleToLevel(2)).toBe("MEDIUM");
    expect(scaleToLevel(4)).toBe("HIGH");
    expect(scaleToLevel(null)).toBeNull();
  });
});
