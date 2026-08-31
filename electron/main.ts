import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, loadOrCreateIdentity } from "./database.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = !app.isPackaged;

function createWindow(): void {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    title: "LocalMesh",
    webPreferences: {
      preload: path.join(currentDirectory, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDevelopment) {
    void window.loadURL("http://localhost:1420");
  } else {
    void window.loadFile(path.join(currentDirectory, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  const database = openDatabase(app.getPath("userData"));
  ipcMain.handle("get-app-info", () => "LocalMesh Electron engine is running.");
  ipcMain.handle("get-device-identity", () => loadOrCreateIdentity(database));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
