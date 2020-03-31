const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require("path");
const isDev = require("electron-is-dev");
const update = require("update-electron-app");

let mainWindow;

update({
  repo: "pinheirolucas/discord_instants_player_ui",
  updateInterval: "1 hour"
});

function createWindow() {
  if (isDev) {
    mainWindow = new BrowserWindow({
      width: 1600,
      height: 900,
      webPreferences: { nodeIntegration: true }
    });
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      webPreferences: { nodeIntegration: true }
    });
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
