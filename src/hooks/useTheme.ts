import { useThemeState } from "../storage";
import { DEFAULT_THEME, isThemeId } from "../themes";
import type { ThemeId } from "../themes";
import { useStamp } from "./useStamp";

/**
 * The palette. Fully wired and persisted, deliberately not exposed: there is
 * no picker in the UI yet, so every install runs on DEFAULT_THEME. A stored
 * value that is not a known palette falls through to the default rather than
 * stamping an attribute that matches no selector.
 */
export function useTheme() {
  const [stored, setStored] = useThemeState(DEFAULT_THEME);
  const theme: ThemeId = isThemeId(stored) ? stored : DEFAULT_THEME;

  useStamp("theme", theme);

  return { theme, setTheme: setStored };
}
