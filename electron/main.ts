import { app, BrowserWindow, ipcMain, nativeTheme, net, shell } from "electron";
import { createWriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Bonjour } from "bonjour-service";
import { autoUpdater } from "electron-updater";
import type { UpdateInfo } from "electron-updater";
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
import {
  chromeChannel,
  defaultChromeColors,
  isChromeColors,
  titleBarHeight,
  windowChromeFor
} from "./chrome";
import {
  openReleasePageChannel,
  openUpdateChannel,
  pickDmgUrl,
  releasePageUrl,
  restartToUpdateChannel,
  updateAvailableChannel,
  updateDownloadedChannel,
  updateRestartReadyChannel
} from "./updates";

// Dev is "not packaged". This used to be the electron-is-dev package, which
// went ESM-only in v3 and so cannot be required from a CommonJS bundle.
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let bonjour: Bonjour | null = null;
let browser: ReturnType<Bonjour["find"]> | null = null;
let discoveryTimer: NodeJS.Timeout | null = null;
let discovered = new Map<string, Server>();

// The version whose dmg has already been fetched (or is being fetched), so a
// later hourly check doesn't re-download it while it's sitting there unopened.
let macUpdateVersion: string | null = null;

function sendToWindow(channel: string, payload?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

/**
 * Squirrel.Mac needs a real Developer ID signature before it will apply an
 * update, which this build doesn't have — so autoDownload stays off on
 * macOS and this fetches the dmg itself instead of the zip
 * autoUpdater.downloadUpdate() would target. The last step, opening it, is
 * left to the person: that's the part signing would actually gate.
 */
function downloadMacUpdate(info: UpdateInfo): void {
  if (macUpdateVersion === info.version) {
    return;
  }

  const url = pickDmgUrl(info.files);
  if (!url) {
    return; // a zip-only publish — nothing here for a person to open
  }

  macUpdateVersion = info.version;

  const destination = path.join(app.getPath("downloads"), path.basename(url));
  const request = net.request(url);

  request.on("response", (response) => {
    const file = createWriteStream(destination);

    file.on("error", () => {
      macUpdateVersion = null;
    });

    response.on("data", (chunk) => file.write(chunk));
    response.on("end", () => {
      file.end();
      sendToWindow(updateDownloadedChannel, { version: info.version, path: destination });
    });
  });

  request.on("error", () => {
    macUpdateVersion = null; // retried on the next hourly check
  });

  request.end();
}

function startUpdateChecks(): void {
  autoUpdater.autoDownload = process.platform === "win32";

  // A repo with no releases yet, or no network, both surface here — without
  // this listener electron-updater throws an unhandled "error" event and
  // takes the app down with it.
  autoUpdater.on("error", () => {});

  autoUpdater.on("update-available", (info) => {
    if (process.platform === "darwin") {
      downloadMacUpdate(info);
    } else if (process.platform === "linux") {
      sendToWindow(updateAvailableChannel, info.version);
    }
  });

  // Windows only — autoDownload is only true there, so this never fires on
  // macOS or Linux.
  autoUpdater.on("update-downloaded", () => sendToWindow(updateRestartReadyChannel));

  void autoUpdater.checkForUpdates().catch(() => {});
  // Mirrors update-electron-app's old interval.
  setInterval(() => void autoUpdater.checkForUpdates().catch(() => {}), 60 * 60 * 1000);
}

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
  // Only covers the frames before the renderer paints; the renderer sends
  // the real colours from tokens.css as soon as it has stamped the palette.
  // nativeTheme is read, never written: setting themeSource would take the
  // app's "auto" mode away from the OS.
  const colors = defaultChromeColors(nativeTheme.shouldUseDarkColors);

  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1280,
    height: 900,
    // Revealed on ready-to-show, after first paint, by which time
    // index.html's guard has already stamped the right palette. No flash.
    show: false,
    backgroundColor: colors.color,
    ...windowChromeFor(process.platform, colors),
    // Linux only. macOS and Windows take the app icon from the bundle
    // (resources/icon.icns, icon.ico); a Linux window has no bundle to read
    // one from, so the running window is handed it here. public/icon.png is
    // copied verbatim into build/, next to this file.
    ...(process.platform === "linux" ? { icon: path.join(__dirname, "icon.png") } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // ready-to-show never fires for a page that failed to load — the dev
  // server not being up yet, say — and the window would stay invisible.
  mainWindow.webContents.once("did-fail-load", () => mainWindow?.show());

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

ipcMain.on(openReleasePageChannel, () => shell.openExternal(releasePageUrl));

ipcMain.on(openUpdateChannel, (event, filePath: unknown) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    return;
  }

  // The renderer is untrusted, but it can only ever echo back the path this
  // process handed it in updateDownloadedChannel in the first place.
  if (typeof filePath === "string" && filePath.startsWith(app.getPath("downloads"))) {
    shell.openPath(filePath);
  }
});

ipcMain.on(restartToUpdateChannel, (event) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    return;
  }

  autoUpdater.quitAndInstall();
});

// The renderer reports its resolved --bg/--fg whenever the palette or mode
// changes. Windows' caption buttons are drawn by the OS and do not follow
// CSS; without this they stay on last launch's palette, and the first switch
// to a light theme leaves dark glyphs on a light bar.
ipcMain.on(chromeChannel, (event, colors: unknown) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    return;
  }

  if (!isChromeColors(colors)) {
    return;
  }

  mainWindow.setBackgroundColor(colors.color);

  if (process.platform === "win32") {
    mainWindow.setTitleBarOverlay({ ...colors, height: titleBarHeight.win32 });
  }
});

app.on("ready", () => {
  createWindow();

  if (!isDev) {
    startUpdateChecks();
  }
});

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
