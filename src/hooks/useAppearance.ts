import { useState } from "react";
import type { ColorMode, ThemeId } from "../themes";
import { useColorMode } from "./useColorMode";
import { useTheme } from "./useTheme";

interface Draft {
  theme: ThemeId;
  mode: ColorMode;
}

/**
 * Palette and colour mode, plus the Aparência shell's draft of both.
 *
 * While the shell is open every pick is stamped on <html> at once — the
 * whole window, native chrome included, previews it — but nothing is
 * persisted until `commit`. `cancel` just drops the draft, and the stamps
 * fall back to what is stored. That keeps an abandoned choice out of
 * localStorage entirely, so it can never reach another window through the
 * storage event.
 */
export function useAppearance() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const color = useColorMode(draft?.mode);
  const palette = useTheme(draft?.theme);

  return {
    theme: draft?.theme ?? palette.theme,
    mode: draft?.mode ?? color.mode,
    resolved: color.resolved,
    editing: draft !== null,
    begin: () => setDraft({ theme: palette.theme, mode: color.mode }),
    preview: (patch: Partial<Draft>) => setDraft((current) => current && { ...current, ...patch }),
    cancel: () => setDraft(null),
    commit: () => {
      if (draft) {
        palette.setTheme(draft.theme);
        color.setMode(draft.mode);
      }
      setDraft(null);
    }
  };
}
