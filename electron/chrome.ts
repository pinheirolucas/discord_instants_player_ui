import type { BrowserWindowConstructorOptions } from "electron";

// Native window chrome, per platform. Types-only import from electron, so
// this stays pure: unit-tested from src/chrome.test.ts, and inlined into the
// sandboxed preload at build time the same way discovery.ts is.

export const chromeChannel = "chrome:set";

/** macOS and Windows merge the app into the OS title bar. Linux leaves the
 *  bar to the window manager, which is what the design draws there. */
export type ChromeKind = "custom" | "native";

export function chromeKind(platform: string): ChromeKind {
  return platform === "darwin" || platform === "win32" ? "custom" : "native";
}

/** Height of the app's own title-bar row, which the OS-drawn controls are
 *  centred in: 42px on macOS, 40px on Windows, per the design canvas. */
export const titleBarHeight = { darwin: 42, win32: 40 } as const;

export interface ChromeColors {
  color: string;
  symbolColor: string;
}

/**
 * sRGB resolutions of Esmalte's --bg and --fg. They only cover the moment
 * before the renderer's first paint; after that it sends the real values
 * from tokens.css over chromeChannel. #13181d is also the Fita icon's ink —
 * the icon is drawn from the default theme.
 */
export function defaultChromeColors(dark: boolean): ChromeColors {
  return dark
    ? { color: "#13181d", symbolColor: "#e9edf2" }
    : { color: "#ebf0f4", symbolColor: "#181e23" };
}

export function windowChromeFor(
  platform: string,
  colors: ChromeColors
): BrowserWindowConstructorOptions {
  if (platform === "darwin") {
    // hiddenInset keeps the real traffic lights. They are 12px tall, so
    // y: 15 centres them in the 42px row; x: 18 is the row's side padding.
    return { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 18, y: 15 } };
  }

  if (platform === "win32") {
    // The OS draws the real caption buttons over the app, in these colours.
    // They do not follow CSS, so the renderer repaints them over
    // chromeChannel whenever the palette or mode changes.
    return {
      titleBarStyle: "hidden",
      titleBarOverlay: { ...colors, height: titleBarHeight.win32 }
    };
  }

  return {};
}

const OPAQUE_HEX = /^#[0-9a-f]{6}$/i;

/** The renderer is untrusted input: accept exactly two opaque hex colours. */
export function isChromeColors(value: unknown): value is ChromeColors {
  if (!value || typeof value !== "object") {
    return false;
  }

  const { color, symbolColor } = value as Record<string, unknown>;

  return (
    typeof color === "string" &&
    OPAQUE_HEX.test(color) &&
    typeof symbolColor === "string" &&
    OPAQUE_HEX.test(symbolColor)
  );
}
