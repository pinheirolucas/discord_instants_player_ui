import { createPersistedState } from "./lib/persisted";
import type { ColorMode, ThemeId } from "./themes";

export interface Instant {
  name: string;
  url: string;
}

export const useInstantsState = createPersistedState<Instant[]>("instants");

/** The palette. Was "light" | "dark" before the token rebuild; index.html's
 *  guard migrates that shape on boot. A backup written before the change
 *  needs no migration: ImportForm only ever restores "instants". */
export const useThemeState = createPersistedState<ThemeId>("theme");

/** auto | light | dark. Split out of "theme" so both can be persisted. */
export const useColorModeState = createPersistedState<ColorMode>("colorMode");

export const useSelectedServer = createPersistedState<string | null>("selectedServer");
