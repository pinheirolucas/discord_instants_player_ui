const { app, BrowserWindow } = require("electron");
const path = require("path");
const { Bonjour } = require("bonjour-service");
const {
  updateElectronApp,
  UpdateSourceType
} = require("update-electron-app");
const {
  discoveryChannel,
  discoveryType,
  discoveryProtocol,
  discoveryQueryInterval,
  buildApiUrl
} = require("./discovery");

// Dev is "not packaged". This used to be the electron-is-dev package, which went
// ESM-only in v3 and so cannot be required from this CommonJS file at all.
const isDev = !app.isPackaged;

let mainWindow;
let bonjour = null;
let browser = null;
let discoveryTimer = null;
let discoveredApiUrl = null;

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: "pinheirolucas/discord_instants_player_ui"
  },
  updateInterval: "1 hour"
});

function publishApiUrl(apiUrl) {
  discoveredApiUrl = apiUrl;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(discoveryChannel, apiUrl);
  }
}

function startDiscovery() {
  bonjour = new Bonjour();
  browser = bonjour.find({ type: discoveryType, protocol: discoveryProtocol });

  browser.on("up", service => {
    const apiUrl = buildApiUrl(service);

    if (apiUrl) {
      publishApiUrl(apiUrl);
    }
  });

  discoveryTimer = setInterval(() => browser.update(), discoveryQueryInterval);
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

  discoveredApiUrl = null;
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
    if (discoveredApiUrl) {
      publishApiUrl(discoveredApiUrl);
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
