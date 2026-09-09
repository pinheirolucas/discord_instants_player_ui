const { contextBridge, ipcRenderer } = require("electron");

const serversChannel = "discovery:servers";
const refreshChannel = "discovery:refresh";

const listeners = new Set();
let lastServers = [];

ipcRenderer.on(serversChannel, (_event, servers) => {
  lastServers = Array.isArray(servers) ? servers : [];
  listeners.forEach(listener => listener(lastServers));
});

contextBridge.exposeInMainWorld("instantsDiscovery", {
  onServers: listener => {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.add(listener);

    if (lastServers.length > 0) {
      listener(lastServers);
    }

    return () => {
      listeners.delete(listener);
    };
  },
  refresh: () => ipcRenderer.send(refreshChannel)
});
