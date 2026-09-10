import { describe, expect, it } from "vitest";
import { wavePath } from "./wave";

describe("wavePath", () => {
  it("draws the same wave for the same clip name", () => {
    expect(wavePath("Bruxaria")).toBe(wavePath("Bruxaria"));
  });

  it("draws a different wave for a different name", () => {
    expect(wavePath("Bruxaria")).not.toBe(wavePath("Vish"));
  });

  it("is forty vertical bars that stay inside the 26-unit-tall viewBox", () => {
    const bars = wavePath("Risada do Ronaldinho").match(/M[\d.]+ [\d.]+v-[\d.]+/g) ?? [];
    expect(bars).toHaveLength(40);
    for (const bar of bars) {
      const [, y, h] = bar.match(/M[\d.]+ ([\d.]+)v-([\d.]+)/)!.map(Number);
      expect(y - h).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(26);
    }
  });
});
