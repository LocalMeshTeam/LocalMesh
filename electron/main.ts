import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConversation, createMessage, ensureConversation, listConversations, listMessages, loadOrCreateIdentity, openDatabase, saveReceivedMessage, updateMessageStatus } from "./database.js";
import { DISCOVERY_PORT, getLocalAddresses, MULTICAST_ADDRESS, PeerDiscovery } from "./discovery.js";
import { NetworkTransport, TRANSPORT_PORT } from "./transport.js";
import { SecureIdentity } from "./security.js";
import { trustedPeersPath, TrustedPeerStore } from "./trust.js";

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
    const secureIdentity = new SecureIdentity(path.join(app.getPath("userData"), "security"));
    const trustedPeers = new TrustedPeerStore(trustedPeersPath(path.join(app.getPath("userData"), "security")));
    console.log(`LocalMesh device: ${identity.device_name} (${identity.display_name})`);
    console.log(`Security identity fingerprint: ${secureIdentity.fingerprint}`);
    console.log(`Local IPv4 addresses: ${getLocalAddresses().join(", ") || "none detected"}`);
    const lanTransport = new NetworkTransport(identity, secureIdentity, (message) => {
      try {
        ensureConversation(database, message.conversation_id, message.sender_id, message.timestamp);
        saveReceivedMessage(database, message);
      } catch (error) {
        console.error("Failed to persist received message:", error);
      }
    }, (messageId) => updateMessageStatus(database, messageId, "delivered"), 45455, "0.0.0.0", trustedPeers);
    lanTransport.start();
    const peerDiscovery = new PeerDiscovery(identity, secureIdentity);
    peerDiscovery.start();
    ipcMain.handle("get-app-info", () => "LocalMesh Electron engine is running.");
    ipcMain.handle("get-device-identity", () => identity);
    ipcMain.handle("get-network-info", () => ({
      addresses: getLocalAddresses(),
      discovery_address: MULTICAST_ADDRESS,
      discovery_port: DISCOVERY_PORT,
      transport_port: TRANSPORT_PORT,
    }));
    ipcMain.handle("list-peers", () => peerDiscovery.listPeers());
    ipcMain.handle("list-conversations", () => listConversations(database));
    ipcMain.handle("create-conversation", (_event, peerId: string) => createConversation(database, peerId));
    ipcMain.handle("list-messages", (_event, conversationId: string) => listMessages(database, conversationId));
    ipcMain.handle("create-message", (_event, conversationId: string, content: string) => {
      const identity = loadOrCreateIdentity(database);
      const message = createMessage(database, conversationId, identity.device_id, content);
      const peer = peerDiscovery.listPeers().find((candidate) => candidate.device_id === message.receiver_id);
      if (!peer) return message;
      return lanTransport.sendMessage(peer, message)
        .then(() => {
          updateMessageStatus(database, message.message_id, "sent");
          return { ...message, status: "sent" as const };
        })
      .catch((error: unknown) => {
          console.error("Failed to send message:", error);
          updateMessageStatus(database, message.message_id, "failed");
          return { ...message, status: "failed" as const };
        });
    });
    ipcMain.handle("list-trusted-peers", () => trustedPeers.list());
    ipcMain.handle("trust-peer", (_event, deviceId: string) => {
      const peer = peerDiscovery.listPeers().find((candidate) => candidate.device_id === deviceId);
      if (!peer) throw new Error("Peer has not been discovered");
      return trustedPeers.trust(peer.device_id, peer.signing_public_key);
    });
    ipcMain.handle("revoke-peer", (_event, deviceId: string) => trustedPeers.revoke(deviceId));
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    app.on("before-quit", () => {
      peerDiscovery.stop();
      lanTransport.stop();
      database.close();
    });
  } catch (error) {
    console.error("Failed to initialize LocalMesh:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
