const { contextBridge, ipcRenderer } = require("electron");

const channel = "discovery:api-url";

const listeners = new Set();
let lastApiUrl = null;

ipcRenderer.on(channel, (_event, apiUrl) => {
  lastApiUrl = apiUrl;
  listeners.forEach(listener => listener(apiUrl));
});

contextBridge.exposeInMainWorld("instantsDiscovery", {
  onApiUrl: listener => {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.add(listener);

    if (lastApiUrl) {
      listener(lastApiUrl);
    }

    return () => {
      listeners.delete(listener);
    };
  }
});
