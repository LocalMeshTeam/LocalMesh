import net, { type Socket, type Server } from "node:net";
import type { DeviceIdentity, Message } from "./database.js";
import { decodePacket, encodePacket, helloSigningData, messageSigningData, PROTOCOL_VERSION, type FileAckPacket, type FileChunkPacket, type FileCompletePacket, type FileOfferPacket, type HelloPacket, type MessagePacket, type NetworkPacket } from "./protocol.js";
import { SecureIdentity } from "./security.js";
import type { TrustedPeerStore } from "./trust.js";

export const TRANSPORT_PORT = 45455;
const ACK_TIMEOUT_MS = 5_000;
const MAX_SEND_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;
const MAX_FILE_SEND_ATTEMPTS = 3;
const MAX_MESSAGE_CLOCK_SKEW_MS = 60_000;

export type PeerAddress = { device_id: string; address: string; transport_port: number; signing_public_key: string; exchange_public_key: string };
export type ReceivedFilePacket = FileOfferPacket | FileChunkPacket | FileCompletePacket;

export class NetworkTransport {
  private readonly server: Server;
  private readonly sockets = new Map<string, Socket>();
  private readonly buffers = new Map<Socket, string>();
  private readonly socketPeers = new Map<Socket, { device_id: string; signing_public_key: string; exchange_public_key: string }>();
  private readonly pinnedSigningKeys = new Map<string, string>();
  private readonly pendingAcks = new Map<string, { resolve: () => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private readonly pendingFileAcks = new Map<string, { resolve: () => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private started = false;

  public constructor(
    private readonly identity: DeviceIdentity,
    private readonly secureIdentity: SecureIdentity,
    private readonly onMessage: (message: Message) => void,
    private readonly onAck: (messageId: string) => void,
    private readonly port = TRANSPORT_PORT,
    private readonly host = "0.0.0.0",
    private readonly trustedPeers?: TrustedPeerStore,
    private readonly onFilePacket?: (packet: ReceivedFilePacket, peer: PeerAddress) => boolean,
  ) {
    this.server = net.createServer((socket) => this.attachSocket(socket));
    this.server.on("error", (error) => console.error("LAN transport server error:", error));
  }

  public start(): void {
    if (this.started) return;
    this.started = true;
    this.server.listen(this.port, this.host, () => console.log(`LAN transport listening on ${this.host}:${this.port}`));
  }

  public async sendMessage(peer: PeerAddress, message: Message): Promise<void> {
    let lastError: Error = new Error("Message delivery failed");
    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
      try {
        await this.sendAttempt(peer, message);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_SEND_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
    throw lastError;
  }

  public async sendFilePacket(peer: PeerAddress, packet: ReceivedFilePacket): Promise<void> {
    let lastError: Error = new Error("File packet delivery failed");
    for (let attempt = 1; attempt <= MAX_FILE_SEND_ATTEMPTS; attempt += 1) {
      try { await this.sendFilePacketAttempt(peer, packet); return; }
      catch (error) { lastError = error instanceof Error ? error : new Error(String(error)); if (attempt < MAX_FILE_SEND_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS)); }
    }
    throw lastError;
  }

  private sendFilePacketAttempt(peer: PeerAddress, packet: ReceivedFilePacket): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingSocket = this.sockets.get(peer.device_id);
      if (existingSocket && !existingSocket.destroyed) {
        this.writeAndWaitForFileAck(existingSocket, packet, resolve, reject);
        return;
      }
      const socket = net.createConnection({ host: peer.address, port: peer.transport_port });
      socket.once("connect", () => {
        this.attachSocket(socket);
        this.write(socket, this.helloPacket());
        this.writeAndWaitForFileAck(socket, packet, resolve, reject);
      });
      socket.once("error", reject);
    });
  }

  private writeAndWaitForFileAck(socket: Socket, packet: ReceivedFilePacket, resolve: () => void, reject: (error: Error) => void): void {
    const key = this.fileAckKey(packet);
    const timer = setTimeout(() => { this.pendingFileAcks.delete(key); reject(new Error(`Timed out waiting for file acknowledgement ${key}`)); }, ACK_TIMEOUT_MS);
    this.pendingFileAcks.set(key, { resolve, reject, timer });
    this.write(socket, packet);
  }

  private fileAckKey(packet: ReceivedFilePacket): string { return `${packet.transfer_id}:${packet.type === "file-chunk" ? packet.offset : -1}`; }

  private sendAttempt(peer: PeerAddress, message: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingSocket = this.sockets.get(peer.device_id);
      if (existingSocket && !existingSocket.destroyed) {
        this.write(existingSocket, this.messagePacket(message, peer.exchange_public_key));
        this.waitForAck(message.message_id, resolve, reject);
        return;
      }

      const socket = net.createConnection({ host: peer.address, port: peer.transport_port });
      let connected = false;
      socket.once("connect", () => {
        connected = true;
        this.attachSocket(socket);
        this.write(socket, this.helloPacket());
        this.write(socket, this.messagePacket(message, peer.exchange_public_key));
        this.waitForAck(message.message_id, resolve, reject);
      });
      socket.once("error", (error) => {
        if (!connected) reject(error);
      });
    });
  }

  private waitForAck(messageId: string, resolve: () => void, reject: (error: Error) => void): void {
    const timer = setTimeout(() => {
      this.pendingAcks.delete(messageId);
      reject(new Error(`Timed out waiting for acknowledgement of ${messageId}`));
    }, ACK_TIMEOUT_MS);
    this.pendingAcks.set(messageId, { resolve, reject, timer });
  }

  public stop(): void {
    if (!this.started) return;
    this.started = false;
    for (const socket of this.sockets.values()) socket.destroy();
    this.sockets.clear();
    this.server.close();
  }

  private attachSocket(socket: Socket): void {
    this.buffers.set(socket, "");
    socket.on("data", (data) => this.handleData(socket, data.toString()));
    socket.on("close", () => {
      this.buffers.delete(socket);
      this.socketPeers.delete(socket);
      for (const [deviceId, peerSocket] of this.sockets) if (peerSocket === socket) this.sockets.delete(deviceId);
    });
    socket.on("error", (error) => console.error("LAN transport connection error:", error));
  }

  private handleData(socket: Socket, data: string): void {
    const buffer = `${this.buffers.get(socket) ?? ""}${data}`;
    const lines = buffer.split("\n");
    this.buffers.set(socket, lines.pop() ?? "");
    for (const line of lines) {
      const packet = decodePacket(line);
      if (packet) this.handlePacket(socket, packet);
    }
  }

  private handlePacket(socket: Socket, packet: NetworkPacket): void {
    if (packet.type === "hello") {
      const { signature: _signature, ...unsignedPacket } = packet;
      if (!SecureIdentity.verify(helloSigningData(unsignedPacket), packet.signature, packet.signing_public_key)) {
        console.error(`Rejected unauthenticated hello from ${packet.device_id}`);
        socket.destroy();
        return;
      }
      const pinnedKey = this.pinnedSigningKeys.get(packet.device_id);
      if (pinnedKey && pinnedKey !== packet.signing_public_key) {
        console.error(`Rejected signing-key change for peer ${packet.device_id}`);
        socket.destroy();
        return;
      }
      if (this.trustedPeers?.check(packet.device_id, packet.signing_public_key) === "rejected") {
        console.error(`Rejected untrusted key for peer ${packet.device_id}`);
        socket.destroy();
        return;
      }
      this.pinnedSigningKeys.set(packet.device_id, packet.signing_public_key);
      this.sockets.set(packet.device_id, socket);
      this.socketPeers.set(socket, { device_id: packet.device_id, signing_public_key: packet.signing_public_key, exchange_public_key: packet.exchange_public_key });
      return;
    }
    if (packet.type === "ack") {
      const pending = this.pendingAcks.get(packet.message_id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingAcks.delete(packet.message_id);
        pending.resolve();
      }
      this.onAck(packet.message_id);
      return;
    }
    if (packet.type === "file-ack") {
      const pending = this.pendingFileAcks.get(`${packet.transfer_id}:${packet.offset}`);
      if (pending) { clearTimeout(pending.timer); this.pendingFileAcks.delete(`${packet.transfer_id}:${packet.offset}`); packet.accepted ? pending.resolve() : pending.reject(new Error("Peer rejected file packet")); }
      return;
    }
    const peer = this.socketPeers.get(socket);
    if (!peer) return;
    if (packet.type !== "message") {
      if (packet.type === "file-offer" && (packet.sender_id !== peer.device_id || packet.receiver_id !== this.identity.device_id)) return;
      const accepted = this.onFilePacket?.(packet, { device_id: peer.device_id, address: "", transport_port: 0, signing_public_key: peer.signing_public_key, exchange_public_key: peer.exchange_public_key }) ?? false;
      this.write(socket, { type: "file-ack", version: PROTOCOL_VERSION, transfer_id: packet.transfer_id, offset: packet.type === "file-chunk" ? packet.offset : -1, accepted });
      return;
    }
    if (packet.sender_id !== peer.device_id || packet.receiver_id !== this.identity.device_id) return;
    const timestamp = Date.parse(packet.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > MAX_MESSAGE_CLOCK_SKEW_MS) {
      console.error(`Rejected stale or future message ${packet.message_id}`);
      return;
    }
    const { signature: _signature, ...unsignedPacket } = packet;
    if (!SecureIdentity.verify(messageSigningData(unsignedPacket), packet.signature, peer.signing_public_key)) {
      console.error(`Rejected unauthenticated message ${packet.message_id}`);
      return;
    }
    try {
      const content = this.secureIdentity.decrypt(packet, peer.exchange_public_key);
      this.onMessage({ message_id: packet.message_id, conversation_id: packet.conversation_id, sender_id: packet.sender_id, receiver_id: packet.receiver_id, content, timestamp: packet.timestamp, status: "delivered" });
    } catch (error) {
      console.error(`Failed to decrypt message ${packet.message_id}:`, error);
      return;
    }
    this.write(socket, { type: "ack", version: PROTOCOL_VERSION, message_id: packet.message_id });
  }

  private write(socket: Socket, packet: NetworkPacket): void {
    if (!socket.destroyed) socket.write(encodePacket(packet));
  }

  private helloPacket(): HelloPacket {
    const packet = { type: "hello" as const, version: PROTOCOL_VERSION, device_id: this.identity.device_id, device_name: this.identity.device_name, display_name: this.identity.display_name, signing_public_key: this.secureIdentity.signingPublicKey, exchange_public_key: this.secureIdentity.exchangePublicKey };
    return { ...packet, signature: this.secureIdentity.sign(helloSigningData(packet)) };
  }

  private messagePacket(message: Message, peerExchangePublicKey: string): MessagePacket {
    const encrypted = this.secureIdentity.encrypt(message.content, peerExchangePublicKey);
    const packet = { type: "message" as const, version: PROTOCOL_VERSION, message_id: message.message_id, conversation_id: message.conversation_id, sender_id: message.sender_id, receiver_id: message.receiver_id, timestamp: message.timestamp, ...encrypted };
    return { ...packet, signature: this.secureIdentity.sign(messageSigningData(packet)) };
  }
}
