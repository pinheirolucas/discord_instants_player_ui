import { isPlatformId } from "../themes";
import type { PlatformId } from "../themes";

/** Whether Electron merged the window into the OS title bar (macOS,
 *  Windows) or left it to the window manager — or there is no Electron. */
export type ChromeKind = "custom" | "native";

declare global {
  interface Window {
    instantsPlatform?: {
      os?: string;
      chrome?: string;
      setChrome?: (colors: { color: string; symbolColor: string }) => void;
    };
    instantsDiscovery?: {
      onServers: (listener: (servers: unknown[]) => void) => () => void;
      refresh: () => void;
    };
  }
}

// Dev-only overrides, so every platform is reachable from one machine:
// ?os=mac|win|linux and ?chrome=custom|native. The Storybook toolbar drives
// the same values. Checked first, so they win even inside Electron.
function devOverride(name: string): string | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

export function detectPlatform(): PlatformId {
  const forced = devOverride("os");
  if (isPlatformId(forced)) {
    return forced;
  }

  // The preload bridge is the authority when it exists. It does not in a
  // plain browser tab, which is a supported way to run this app.
  const bridge = window.instantsPlatform?.os;
  if (isPlatformId(bridge)) {
    return bridge;
  }

  const ua =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.userAgent ||
    "";

  if (/mac|iphone|ipad/i.test(ua)) return "mac";
  // Not a bare /win/: "darwin" contains it.
  if (/windows|win32|win64/i.test(ua)) return "win";
  return "linux";
}

export function detectChrome(): ChromeKind {
  const forced = devOverride("chrome");
  if (forced === "custom" || forced === "native") {
    return forced;
  }

  return window.instantsPlatform?.chrome === "custom" ? "custom" : "native";
}

// Neither changes within a session — the bridge is in place before any
// module runs — but both are read per call rather than cached at import, so
// a test can install a bridge before it renders.
export function usePlatform(): PlatformId {
  return detectPlatform();
}

export function useChromeKind(): ChromeKind {
  return detectChrome();
}

export function findShortcutLabel(os: PlatformId): string {
  return os === "mac" ? "⌘F" : "Ctrl F";
}

export function isFindShortcut(event: KeyboardEvent, os: PlatformId): boolean {
  if (event.key !== "f" && event.key !== "F") {
    return false;
  }

  return os === "mac" ? event.metaKey : event.ctrlKey;
}
