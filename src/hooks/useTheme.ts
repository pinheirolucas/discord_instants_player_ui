import { useThemeState } from "../storage";
import { DEFAULT_THEME, isThemeId } from "../themes";
import type { ThemeId } from "../themes";
import { useStamp } from "./useStamp";

/**
 * The palette, persisted; picked in the Aparência shell. A stored value that
 * is not a known palette falls through to the default rather than stamping
 * an attribute that matches no selector.
 *
 * `preview`, while set, is what gets stamped instead — the shell's live,
 * unsaved pick. `theme` stays the stored one.
 */
export function useTheme(preview?: ThemeId | null) {
  const [stored, setStored] = useThemeState(DEFAULT_THEME);
  const theme: ThemeId = isThemeId(stored) ? stored : DEFAULT_THEME;

  useStamp("theme", preview ?? theme);

  return { theme, setTheme: setStored };
}
