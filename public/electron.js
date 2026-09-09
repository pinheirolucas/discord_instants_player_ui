const { app, BrowserWindow, ipcMain } = require("electron");
const os = require("os");
const path = require("path");
const { Bonjour } = require("bonjour-service");
const {
  updateElectronApp,
  UpdateSourceType
} = require("update-electron-app");
const {
  discoveryServersChannel,
  discoveryRefreshChannel,
  discoveryType,
  discoveryProtocol,
  discoveryQueryInterval,
  buildServer,
  sortServers
} = require("./discovery");

// Dev is "not packaged". This used to be the electron-is-dev package, which went
// ESM-only in v3 and so cannot be required from this CommonJS file at all.
const isDev = !app.isPackaged;

let mainWindow;
let bonjour = null;
let browser = null;
let discoveryTimer = null;
let discovered = new Map();

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: "pinheirolucas/discord_instants_player_ui"
  },
  updateInterval: "1 hour"
});

function localAddresses() {
  const found = new Set();
  const interfaces = os.networkInterfaces();

  Object.keys(interfaces).forEach(name => {
    (interfaces[name] || []).forEach(entry => found.add(entry.address));
  });

  return found;
}

function publishServers() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      discoveryServersChannel,
      sortServers(Array.from(discovered.values()))
    );
  }
}

function startDiscovery() {
  bonjour = new Bonjour();
  browser = bonjour.find({ type: discoveryType, protocol: discoveryProtocol });

  browser.on("up", service => {
    const server = buildServer(service, localAddresses());

    if (server) {
      discovered.set(server.id, server);
      publishServers();
    }
  });

  browser.on("down", service => {
    const id = service && service.fqdn;

    if (id && discovered.delete(id)) {
      publishServers();
    }
  });

  discoveryTimer = setInterval(() => browser.update(), discoveryQueryInterval);
}

function refreshDiscovery() {
  if (browser) {
    browser.update();
  }
}

function stopDiscovery() {
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

function createWindow() {
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
    mainWindow.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
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
