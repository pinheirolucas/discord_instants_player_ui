import { contextBridge, ipcRenderer } from "electron";
import { discoveryRefreshChannel, discoveryServersChannel } from "./discovery";
import type { Server } from "./discovery";

// The preload runs sandboxed, so it cannot require a sibling module at
// runtime — which is why these channel names used to be spelled out here
// a second time. tsup inlines ./discovery at build time, so there is now
// exactly one definition and no runtime require.

type ServersListener = (servers: Server[]) => void;

const listeners = new Set<ServersListener>();
let lastServers: Server[] = [];

ipcRenderer.on(discoveryServersChannel, (_event, servers: unknown) => {
  lastServers = Array.isArray(servers) ? (servers as Server[]) : [];
  listeners.forEach((listener) => listener(lastServers));
});

contextBridge.exposeInMainWorld("instantsDiscovery", {
  onServers: (listener: ServersListener) => {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.add(listener);

    // A late subscriber still gets the list that arrived before it mounted.
    if (lastServers.length > 0) {
      listener(lastServers);
    }

    return () => {
      listeners.delete(listener);
    };
  },
  refresh: () => ipcRenderer.send(discoveryRefreshChannel)
});

// The renderer has no `process` under contextIsolation, and the plain web
// build has no bridge at all — so the OS answer has to come across here,
// synchronously, before any app script runs. index.html's guard reads it.
const os =
  process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "linux";

contextBridge.exposeInMainWorld("instantsPlatform", { os });
