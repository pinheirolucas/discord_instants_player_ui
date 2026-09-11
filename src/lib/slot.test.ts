import { describe, expect, it } from "vitest";
import { SLOT_COUNT, slotFor } from "./slot";

describe("slotFor", () => {
  it("is stable for a url, so a card keeps its colour across filtering and paging", () => {
    const url = "https://www.myinstants.com/pt/instant/vish/";
    expect(slotFor(url)).toBe(slotFor(url));
  });

  it("only ever answers one of the six palette classes", () => {
    for (let i = 0; i < 500; i++) {
      expect(slotFor(`https://www.myinstants.com/pt/instant/clip-${i}/`)).toMatch(/^p[0-5]$/);
    }
  });

  it("spreads a realistic catalogue across every slot rather than piling into a few", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 600; i++) {
      const slot = slotFor(`https://www.myinstants.com/pt/instant/clip-${i}/`);
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
    expect(counts.size).toBe(SLOT_COUNT);
    for (const n of counts.values()) {
      // 100 expected per slot; a hash this simple still lands well inside ±40%.
      expect(n).toBeGreaterThan(60);
      expect(n).toBeLessThan(140);
    }
  });
});
