import { useEffect, useState } from "react";
import { useColorModeState } from "../storage";
import { isColorMode } from "../themes";
import type { ColorMode, ResolvedMode } from "../themes";
import { useStamp } from "./useStamp";

const QUERY = "(prefers-color-scheme: dark)";

function systemMode(): ResolvedMode {
  return window.matchMedia(QUERY).matches ? "dark" : "light";
}

/**
 * auto | light | dark, persisted; auto is the default and tracks the OS live.
 *
 * matchMedia is the single mechanism on both targets: Electron's renderer
 * honours the OS prefers-color-scheme exactly as a browser does, as long as
 * nothing sets nativeTheme.themeSource away from "system". Nothing does —
 * forcing it there would take auto away and would also restyle every native
 * dialog the app opens.
 */
export function useColorMode() {
  const [stored, setStored] = useColorModeState("auto");
  const mode: ColorMode = isColorMode(stored) ? stored : "auto";

  const [system, setSystem] = useState<ResolvedMode>(systemMode);

  // Subscribed unconditionally rather than only while mode is "auto": the
  // listener is free, and resubscribing on every mode change leaves a window
  // where an OS flip is missed.
  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      setSystem(event.matches ? "dark" : "light");

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedMode = mode === "auto" ? system : mode;

  useStamp("mode", resolved);

  return { mode, setMode: setStored, resolved };
}
