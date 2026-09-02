import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConversation, createMessage, ensureConversation, listConversations, listMessages, loadOrCreateIdentity, openDatabase, saveReceivedMessage, updateMessageStatus } from "./database.js";
import { DISCOVERY_PORT, getLocalAddresses, MULTICAST_ADDRESS, PeerDiscovery } from "./discovery.js";
import { NetworkTransport, TRANSPORT_PORT } from "./transport.js";
import { SecureIdentity } from "./security.js";
import { trustedPeersPath, TrustedPeerStore } from "./trust.js";
import { createFileChunk, createFileComplete, createFileOffer, decryptFileChunk, verifyFileComplete, verifyFileOffer } from "./file-transfer.js";
import { FileStorage } from "./storage.js";
import type { ReceivedFilePacket } from "./transport.js";

type FileProgress = { transfer_id: string; file_name?: string; transferred: number; total: number; status: "sending" | "receiving" | "complete" };

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
    const fileStorage = new FileStorage(app.getPath("userData"));
    const incomingTransfers = new Map<string, { device_id: string; signing_public_key: string; exchange_public_key: string; file_name: string; size: number; received: number }>();
    const outgoingTransfers = new Map<string, AbortController>();
    const notifyRenderer = (channel: "file-progress" | "file-received", payload: unknown): void => { for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload); };
    function handleFilePacket(packet: ReceivedFilePacket, peer: { device_id: string; signing_public_key: string; exchange_public_key: string }): boolean {
      try {
        if (packet.type === "file-offer") {
          if (!verifyFileOffer(packet, peer.signing_public_key)) throw new Error("Invalid file offer signature");
          fileStorage.createTransfer(packet.transfer_id, packet.file_name, packet.size, packet.checksum);
          incomingTransfers.set(packet.transfer_id, { ...peer, file_name: packet.file_name, size: packet.size, received: 0 });
          notifyRenderer("file-progress", { transfer_id: packet.transfer_id, file_name: packet.file_name, transferred: 0, total: packet.size, status: "receiving" } satisfies FileProgress);
        } else if (packet.type === "file-chunk") {
          const sender = incomingTransfers.get(packet.transfer_id);
          if (!sender) throw new Error("Unknown file transfer");
          const chunk = decryptFileChunk(secureIdentity, packet, sender.signing_public_key, sender.exchange_public_key);
          fileStorage.writeChunk(packet.transfer_id, packet.offset, chunk);
          sender.received += chunk.byteLength;
          notifyRenderer("file-progress", { transfer_id: packet.transfer_id, file_name: sender.file_name, transferred: sender.received, total: sender.size, status: "receiving" } satisfies FileProgress);
        } else if (packet.type === "file-complete") {
          const sender = incomingTransfers.get(packet.transfer_id);
          if (!sender || !verifyFileComplete(packet, sender.signing_public_key)) throw new Error("Invalid file completion");
          fileStorage.finalize(packet.transfer_id);
          incomingTransfers.delete(packet.transfer_id);
          notifyRenderer("file-progress", { transfer_id: packet.transfer_id, file_name: sender.file_name, transferred: sender.size, total: sender.size, status: "complete" } satisfies FileProgress);
          notifyRenderer("file-received", { transfer_id: packet.transfer_id, file_name: sender.file_name, path: fileStorage.getPath(packet.transfer_id) });
          console.log(`Received file ${packet.transfer_id} from ${sender.device_id}`);
        }
        return true;
      } catch (error) { console.error(`Failed to process file transfer ${packet.transfer_id}:`, error); return false; }
    }
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
    }, (messageId) => updateMessageStatus(database, messageId, "delivered"), 45455, "0.0.0.0", trustedPeers, (packet, peer) => handleFilePacket(packet, peer));
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
    ipcMain.handle("choose-and-send-file", async (_event, conversationId: string) => {
      const conversation = listConversations(database).find((item) => item.conversation_id === conversationId);
      if (!conversation) throw new Error("Conversation not found");
      const peer = peerDiscovery.listPeers().find((item) => item.device_id === conversation.peer_id);
      if (!peer) throw new Error("Peer is offline");
      const selection = await dialog.showOpenDialog({ properties: ["openFile"] });
      if (selection.canceled || !selection.filePaths[0]) return undefined;
      const content = readFileSync(selection.filePaths[0]);
      const transferId = crypto.randomUUID();
      const controller = new AbortController();
      outgoingTransfers.set(transferId, controller);
      const offer = createFileOffer(identity, secureIdentity, transferId, peer.device_id, path.basename(selection.filePaths[0]), content);
      fileStorage.createTransfer(transferId, offer.file_name, offer.size, offer.checksum);
      notifyRenderer("file-progress", { transfer_id: transferId, file_name: offer.file_name, transferred: 0, total: offer.size, status: "sending" } satisfies FileProgress);
      await lanTransport.sendFilePacket(peer, offer);
      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < content.byteLength; offset += chunkSize) {
        if (controller.signal.aborted) throw new Error("File transfer cancelled");
        await lanTransport.sendFilePacket(peer, createFileChunk(secureIdentity, transferId, offset, content.subarray(offset, offset + chunkSize), peer.exchange_public_key));
        notifyRenderer("file-progress", { transfer_id: transferId, file_name: offer.file_name, transferred: Math.min(offset + chunkSize, content.byteLength), total: content.byteLength, status: "sending" } satisfies FileProgress);
      }
      await lanTransport.sendFilePacket(peer, createFileComplete(secureIdentity, transferId, offer.checksum));
      outgoingTransfers.delete(transferId);
      notifyRenderer("file-progress", { transfer_id: transferId, file_name: offer.file_name, transferred: offer.size, total: offer.size, status: "complete" } satisfies FileProgress);
      return offer;
    });
    ipcMain.handle("cancel-file-transfer", (_event, transferId: string) => {
      outgoingTransfers.get(transferId)?.abort();
      outgoingTransfers.delete(transferId);
      fileStorage.remove(transferId);
      return true;
    });
    ipcMain.handle("open-received-file", (_event, transferId: string) => shell.openPath(fileStorage.getPath(transferId)));
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
