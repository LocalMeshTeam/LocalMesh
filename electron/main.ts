import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConversation, createMessage, listConversations, listMessages, loadOrCreateIdentity, openDatabase } from "./database.js";
import { getLocalAddresses, PeerDiscovery } from "./discovery.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = !app.isPackaged;

function createWindow(): void {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    title: "LocalMesh",
    webPreferences: {
      preload: path.join(currentDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDevelopment) {
    void window.loadURL("http://localhost:1420").catch((error: unknown) => {
      console.error("Failed to load development renderer:", error);
    });
  } else {
    void window.loadFile(path.join(currentDirectory, "../dist/index.html")).catch((error: unknown) => {
      console.error("Failed to load packaged renderer:", error);
    });
  }
}

app.whenReady().then(() => {
  try {
    const database = openDatabase(app.getPath("userData"));
    const identity = loadOrCreateIdentity(database);
    console.log(`LocalMesh device: ${identity.device_name} (${identity.display_name})`);
    console.log(`Local IPv4 addresses: ${getLocalAddresses().join(", ") || "none detected"}`);
    const peerDiscovery = new PeerDiscovery(identity);
    peerDiscovery.start();
    ipcMain.handle("get-app-info", () => "LocalMesh Electron engine is running.");
    ipcMain.handle("get-device-identity", () => identity);
    ipcMain.handle("list-conversations", () => listConversations(database));
    ipcMain.handle("create-conversation", (_event, peerId: string) => createConversation(database, peerId));
    ipcMain.handle("list-messages", (_event, conversationId: string) => listMessages(database, conversationId));
    ipcMain.handle("create-message", (_event, conversationId: string, content: string) => {
      const identity = loadOrCreateIdentity(database);
      return createMessage(database, conversationId, identity.device_id, content);
    });
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    app.on("before-quit", () => peerDiscovery.stop());
  } catch (error) {
    console.error("Failed to initialize LocalMesh:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
