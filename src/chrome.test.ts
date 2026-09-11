import { describe, expect, it } from "vitest";
import {
  chromeKind,
  defaultChromeColors,
  isChromeColors,
  titleBarHeight,
  windowChromeFor
} from "../electron/chrome";

const colors = { color: "#13181d", symbolColor: "#e9edf2" };

describe("windowChromeFor", () => {
  it("keeps the real traffic lights on macOS, centred in the 42px row", () => {
    const options = windowChromeFor("darwin", colors);

    expect(options.titleBarStyle).toBe("hiddenInset");
    // The lights are 12px tall: (42 - 12) / 2 = 15.
    expect(options.trafficLightPosition).toEqual({
      x: 18,
      y: (titleBarHeight.darwin - 12) / 2
    });
  });

  it("has the OS draw the caption buttons on Windows, in the app's colours", () => {
    const options = windowChromeFor("win32", colors);

    expect(options.titleBarStyle).toBe("hidden");
    expect(options.titleBarOverlay).toEqual({ ...colors, height: 40 });
  });

  it("leaves the title bar to the window manager on Linux", () => {
    expect(windowChromeFor("linux", colors)).toEqual({});
  });
});

describe("chromeKind", () => {
  it("merges into the OS bar on macOS and Windows only", () => {
    expect(chromeKind("darwin")).toBe("custom");
    expect(chromeKind("win32")).toBe("custom");
    expect(chromeKind("linux")).toBe("native");
    expect(chromeKind("freebsd")).toBe("native");
  });
});

describe("defaultChromeColors", () => {
  it("covers the first frame with Esmalte's ground and ink in each mode", () => {
    expect(defaultChromeColors(true)).toEqual({ color: "#13181d", symbolColor: "#e9edf2" });
    expect(defaultChromeColors(false)).toEqual({ color: "#ebf0f4", symbolColor: "#181e23" });
  });
});

// The payload arrives from the renderer over IPC, so the main process only
// ever hands the OS two opaque hex colours.
describe("isChromeColors", () => {
  it("accepts two opaque hex colours", () => {
    expect(isChromeColors({ color: "#13181D", symbolColor: "#e9edf2" })).toBe(true);
  });

  it.each([
    ["an oklch value the OS cannot parse", { color: "oklch(0.2 0.01 250)", symbolColor: "#ffffff" }],
    ["shorthand hex", { color: "#fff", symbolColor: "#000000" }],
    ["hex with alpha", { color: "#13181dff", symbolColor: "#000000" }],
    ["a missing colour", { color: "#13181d" }],
    ["a non-string", { color: 1316381, symbolColor: "#000000" }],
    ["null", null],
    ["a string", "#13181d"]
  ])("rejects %s", (_label, value) => {
    expect(isChromeColors(value)).toBe(false);
  });
});
