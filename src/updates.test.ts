import { describe, expect, it } from "vitest";

import { checkForUpdatesLabel, pickDmgUrl } from "../electron/updates";

describe("pickDmgUrl", () => {
  it("picks the .dmg entry among the files electron-builder lists", () => {
    const url = pickDmgUrl([
      { url: "https://example.com/App-1.2.3-mac.zip" },
      { url: "https://example.com/App-1.2.3.dmg" }
    ]);

    expect(url).toBe("https://example.com/App-1.2.3.dmg");
  });

  it("matches case-insensitively", () => {
    const url = pickDmgUrl([{ url: "https://example.com/App-1.2.3.DMG" }]);

    expect(url).toBe("https://example.com/App-1.2.3.DMG");
  });

  it("returns null for a zip-only publish", () => {
    const url = pickDmgUrl([{ url: "https://example.com/App-1.2.3-mac.zip" }]);

    expect(url).toBeNull();
  });

  it("returns null for a missing or malformed files list", () => {
    expect(pickDmgUrl(null)).toBeNull();
    expect(pickDmgUrl(undefined)).toBeNull();
    expect(pickDmgUrl([])).toBeNull();
  });
});

describe("checkForUpdatesLabel", () => {
  it("labels in Portuguese for a pt* OS locale", () => {
    expect(checkForUpdatesLabel("pt-BR")).toBe("Verificar atualizações…");
    expect(checkForUpdatesLabel("pt-PT")).toBe("Verificar atualizações…");
    expect(checkForUpdatesLabel("pt")).toBe("Verificar atualizações…");
  });

  it("falls back to English for everything else", () => {
    expect(checkForUpdatesLabel("en-US")).toBe("Check for Updates…");
    expect(checkForUpdatesLabel("es-ES")).toBe("Check for Updates…");
  });
});
