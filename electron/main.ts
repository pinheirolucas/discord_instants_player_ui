import { app, BrowserWindow, ipcMain } from "electron";
import os from "node:os";
import path from "node:path";
import { Bonjour } from "bonjour-service";
import { updateElectronApp, UpdateSourceType } from "update-electron-app";
import {
  buildServer,
  discoveryProtocol,
  discoveryQueryInterval,
  discoveryRefreshChannel,
  discoveryServersChannel,
  discoveryType,
  sortServers
} from "./discovery";
import type { DiscoveredService, Server } from "./discovery";

// Dev is "not packaged". This used to be the electron-is-dev package, which
// went ESM-only in v3 and so cannot be required from a CommonJS bundle.
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let bonjour: Bonjour | null = null;
let browser: ReturnType<Bonjour["find"]> | null = null;
let discoveryTimer: NodeJS.Timeout | null = null;
let discovered = new Map<string, Server>();

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: "pinheirolucas/discord_instants_player_ui"
  },
  updateInterval: "1 hour"
});

function localAddresses(): Set<string> {
  const found = new Set<string>();
  const interfaces = os.networkInterfaces();

  Object.keys(interfaces).forEach((name) => {
    (interfaces[name] || []).forEach((entry) => found.add(entry.address));
  });

  return found;
}

function publishServers(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      discoveryServersChannel,
      sortServers(Array.from(discovered.values()))
    );
  }
}

function startDiscovery(): void {
  bonjour = new Bonjour();
  browser = bonjour.find({ type: discoveryType, protocol: discoveryProtocol });

  browser.on("up", (service: DiscoveredService) => {
    const server = buildServer(service, localAddresses());

    if (server) {
      discovered.set(server.id, server);
      publishServers();
    }
  });

  browser.on("down", (service: DiscoveredService) => {
    const id = service && service.fqdn;

    if (id && discovered.delete(id)) {
      publishServers();
    }
  });

  // Not a one-shot lookup: a backend started after the app still turns up.
  discoveryTimer = setInterval(() => browser?.update(), discoveryQueryInterval);
}

function refreshDiscovery(): void {
  browser?.update();
}

function stopDiscovery(): void {
  if (discoveryTimer) {
    clearInterval(discoveryTimer);
    discoveryTimer = null;
  }

  if (browser) {
    browser.stop();
    browser = null;
  }

  if (bonjour) {
    bonjour.destroy();
    bonjour = null;
  }

  discovered = new Map();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (discovered.size > 0) {
      publishServers();
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.setMenu(null);
    mainWindow.loadURL(`file://${path.join(__dirname, "index.html")}`);
  }

  startDiscovery();

  mainWindow.on("closed", () => {
    stopDiscovery();
    mainWindow = null;
  });
}

ipcMain.on(discoveryRefreshChannel, () => refreshDiscovery());

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
