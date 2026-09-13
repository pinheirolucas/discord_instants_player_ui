import { describe, it, expect } from "vitest";

import { DEFAULT_REGION, REGIONS, isRegion, regionLabel } from "./regions";

describe("regions", () => {
  // The backend answers invalid_region for anything but ^[a-z]{2}$, so a code
  // in any other shape would break the catalogue for whoever picked it.
  it("only lists codes the backend accepts, each once", () => {
    for (const region of REGIONS) {
      expect(region).toMatch(/^[a-z]{2}$/);
    }
    expect(new Set(REGIONS).size).toBe(REGIONS.length);
  });

  it("defaults to Brazil, which is one of them", () => {
    expect(DEFAULT_REGION).toBe("br");
    expect(isRegion(DEFAULT_REGION)).toBe(true);
  });

  it("accepts only a listed code, exactly as stored", () => {
    expect(isRegion("pt")).toBe(true);

    for (const value of ["zz", "PT", " br", "", null, undefined, 42, ["br"]]) {
      expect(isRegion(value)).toBe(false);
    }
  });

  it("names each region in the given language", () => {
    expect(regionLabel("br", "pt-BR")).toBe("Brasil");
    expect(regionLabel("us", "pt-BR")).toBe("Estados Unidos");
    expect(regionLabel("gb", "pt-BR")).toBe("Reino Unido");

    expect(regionLabel("br", "en-US")).toBe("Brazil");
    expect(regionLabel("us", "en-US")).toBe("United States");
    expect(regionLabel("gb", "en-US")).toBe("United Kingdom");
  });
});
