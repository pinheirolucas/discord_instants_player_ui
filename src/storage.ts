import { createPersistedState } from "./lib/persisted";
import { DEFAULT_THEME } from "./themes";
import type { ColorMode, ThemeId } from "./themes";

export interface Instant {
  name: string;
  url: string;
}

export const useInstantsState = createPersistedState<Instant[]>("instants");

/** The palette. Was "light" | "dark" before the token rebuild; index.html's
 *  guard migrates that shape on boot, and importFromJSON does the same for a
 *  backup written before the change. */
export const useThemeState = createPersistedState<ThemeId>("theme");

/** auto | light | dark. Split out of "theme" so both can be persisted. */
export const useColorModeState = createPersistedState<ColorMode>("colorMode");

export const useSelectedServer = createPersistedState<string | null>("selectedServer");

export const storageDefaults = {
  theme: DEFAULT_THEME,
  colorMode: "auto" as ColorMode
};

/** Rewrites a pre-rebuild payload in place: "theme" holding "light"/"dark"
 *  becomes "colorMode", and the palette falls back to the default. Shared by
 *  index.html's boot guard (inlined there, since it runs before any module)
 *  and ImportForm, so restoring an old backup cannot reintroduce the old shape. */
export function migrateStoredShape(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...raw };
  const theme = next.theme;

  if (theme === "light" || theme === "dark") {
    next.colorMode = theme;
    next.theme = DEFAULT_THEME;
  }

  return next;
}
