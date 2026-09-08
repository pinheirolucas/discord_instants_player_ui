const { app, BrowserWindow } = require("electron");
const path = require("path");
const {
  updateElectronApp,
  UpdateSourceType
} = require("update-electron-app");

// Dev is "not packaged". This used to be the electron-is-dev package, which went
// ESM-only in v3 and so cannot be required from this CommonJS file at all.
const isDev = !app.isPackaged;

let mainWindow;

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: "pinheirolucas/discord_instants_player_ui"
  },
  updateInterval: "1 hour"
});

function createWindow() {
  // No webPreferences overrides on purpose: contextIsolation stays on and
  // nodeIntegration stays off, which is what modern Electron defaults to. The
  // renderer only uses web APIs (axios over fetch, localStorage), so it needs
  // nothing from Node and no preload bridge. If the shelved global-keybinding
  // feature in FavoritesPanel comes back, a contextBridge preload is where it
  // would go.
  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1280,
    height: 900
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.setMenu(null);
    mainWindow.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
  }

  mainWindow.on("closed", () => (mainWindow = null));
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
