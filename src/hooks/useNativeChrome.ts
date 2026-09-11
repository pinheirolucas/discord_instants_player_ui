import { useEffect } from "react";
import { toHex } from "../lib/toHex";
import type { ResolvedMode, ThemeId } from "../themes";

/**
 * Keeps the OS-drawn parts of the window on the current palette: the window
 * background, and on Windows the caption-button overlay, which does not
 * follow CSS. Without it the first switch to a light theme on Windows leaves
 * dark glyphs on a light bar.
 *
 * Must be called after useColorMode and useTheme: effects run in call order,
 * so by the time this one reads the tokens, <html> already carries the new
 * data-mode and data-theme and --bg/--fg resolve to the new palette.
 */
export function useNativeChrome(mode: ResolvedMode, theme: ThemeId): void {
  useEffect(() => {
    const setChrome = window.instantsPlatform?.setChrome;
    if (typeof setChrome !== "function") {
      return;
    }

    const style = getComputedStyle(document.documentElement);
    const color = toHex(style.getPropertyValue("--bg"));
    const symbolColor = toHex(style.getPropertyValue("--fg"));

    if (color && symbolColor) {
      setChrome({ color, symbolColor });
    }
  }, [mode, theme]);
}
