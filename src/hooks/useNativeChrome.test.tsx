import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNativeChrome } from "./useNativeChrome";

// Tokens as getComputedStyle would resolve them on <html>, per palette.
const PALETTES: Record<string, Record<string, string>> = {
  dark: { "--bg": "#13181d", "--fg": "#e9edf2" },
  light: { "--bg": "#ebf0f4", "--fg": "#181e23" }
};
let current = "dark";

beforeEach(() => {
  current = "dark";
  vi.spyOn(window, "getComputedStyle").mockImplementation(
    () => ({ getPropertyValue: (name: string) => PALETTES[current][name] ?? "" }) as never
  );
  // Paints and reads back whatever hex it is handed (see toHex.test.ts).
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
    const ctx = {
      fillStyle: "",
      fillRect: () => {},
      getImageData: () => {
        const n = parseInt(String(ctx.fillStyle).slice(1), 16) || 0;
        return { data: [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255] };
      }
    };
    return ctx as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.instantsPlatform;
});

describe("useNativeChrome", () => {
  it("hands the main process the resolved ground and ink", () => {
    const setChrome = vi.fn();
    window.instantsPlatform = { os: "win", chrome: "custom", setChrome };

    renderHook(() => useNativeChrome("dark", "esmalte"));

    expect(setChrome).toHaveBeenCalledWith({ color: "#13181d", symbolColor: "#e9edf2" });
  });

  it("repaints when the mode changes, so the OS-drawn buttons follow", () => {
    const setChrome = vi.fn();
    window.instantsPlatform = { os: "win", chrome: "custom", setChrome };

    const { rerender } = renderHook(({ mode }) => useNativeChrome(mode, "esmalte"), {
      initialProps: { mode: "dark" as "dark" | "light" }
    });

    current = "light";
    rerender({ mode: "light" });

    expect(setChrome).toHaveBeenLastCalledWith({ color: "#ebf0f4", symbolColor: "#181e23" });
    expect(setChrome).toHaveBeenCalledTimes(2);
  });

  it("does nothing in a browser tab, where there is no bridge", () => {
    expect(() => renderHook(() => useNativeChrome("dark", "esmalte"))).not.toThrow();
  });

  it("sends nothing while the tokens have not resolved", () => {
    const setChrome = vi.fn();
    window.instantsPlatform = { os: "win", chrome: "custom", setChrome };
    current = "missing";
    PALETTES.missing = {};

    renderHook(() => useNativeChrome("dark", "esmalte"));

    expect(setChrome).not.toHaveBeenCalled();
  });
});
