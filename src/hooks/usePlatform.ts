import { isPlatformId } from "../themes";
import type { PlatformId } from "../themes";

declare global {
  interface Window {
    instantsPlatform?: { os?: string };
    instantsDiscovery?: {
      onServers: (listener: (servers: unknown[]) => void) => () => void;
      refresh: () => void;
    };
  }
}

function detect(): PlatformId {
  // The preload bridge is the authority when it exists. It does not in a
  // plain browser tab, which is a supported way to run this app, so the UA
  // answer has to stand on its own.
  const bridge = window.instantsPlatform?.os;
  if (isPlatformId(bridge)) {
    return bridge;
  }

  // Dev-only override so all three platforms are reachable without three
  // machines. The Storybook toolbar drives the same three values.
  if (import.meta.env.DEV) {
    const forced = new URLSearchParams(window.location.search).get("os");
    if (isPlatformId(forced)) {
      return forced;
    }
  }

  const ua =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ||
    navigator.userAgent ||
    "";

  if (/mac|iphone|ipad/i.test(ua)) return "mac";
  if (/win/i.test(ua)) return "win";
  return "linux";
}

const platform = detect();

/** The platform never changes within a session, so this is a constant read
 *  rather than state. index.html has already stamped data-os from the same
 *  source before first paint; this is for the logic that is not CSS —
 *  the find shortcut's modifier, and the label the search field shows. */
export function usePlatform(): PlatformId {
  return platform;
}

export function findShortcutLabel(os: PlatformId): string {
  return os === "mac" ? "⌘F" : "Ctrl+F";
}

export function isFindShortcut(event: KeyboardEvent, os: PlatformId): boolean {
  if (event.key !== "f" && event.key !== "F") {
    return false;
  }

  return os === "mac" ? event.metaKey : event.ctrlKey;
}
