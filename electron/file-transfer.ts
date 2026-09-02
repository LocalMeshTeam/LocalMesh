import { createHash } from "node:crypto";
import type { DeviceIdentity } from "./database.js";
import { fileChunkSigningData, fileCompleteSigningData, fileOfferSigningData, type FileChunkPacket, type FileCompletePacket, type FileOfferPacket } from "./protocol.js";
import { SecureIdentity } from "./security.js";

export function createFileOffer(identity: DeviceIdentity, security: SecureIdentity, transferId: string, receiverId: string, fileName: string, content: Uint8Array): FileOfferPacket {
  const packet = { type: "file-offer" as const, version: 1, transfer_id: transferId, sender_id: identity.device_id, receiver_id: receiverId, file_name: fileName, size: content.byteLength, checksum: createHash("sha256").update(content).digest("hex"), timestamp: new Date().toISOString() };
  return { ...packet, signature: security.sign(fileOfferSigningData(packet)) };
}

export function createFileChunk(security: SecureIdentity, transferId: string, offset: number, content: Uint8Array, peerExchangeKey: string): FileChunkPacket {
  const encrypted = security.encrypt(Buffer.from(content).toString("base64"), peerExchangeKey);
  const packet = { type: "file-chunk" as const, version: 1, transfer_id: transferId, offset, ...encrypted };
  return { ...packet, signature: security.sign(fileChunkSigningData(packet)) };
}

export function decryptFileChunk(security: SecureIdentity, packet: FileChunkPacket, peerSigningKey: string, peerExchangeKey: string): Uint8Array {
  const { signature: _signature, ...unsignedPacket } = packet;
  if (!SecureIdentity.verify(fileChunkSigningData(unsignedPacket), packet.signature, peerSigningKey)) throw new Error("Invalid file chunk signature");
  return Buffer.from(security.decrypt(packet, peerExchangeKey), "base64");
}

export function createFileComplete(security: SecureIdentity, transferId: string, checksum: string): FileCompletePacket {
  const packet = { type: "file-complete" as const, version: 1, transfer_id: transferId, checksum };
  return { ...packet, signature: security.sign(fileCompleteSigningData(packet)) };
}

export function verifyFileOffer(packet: FileOfferPacket, peerSigningKey: string): boolean {
  const { signature: _signature, ...unsignedPacket } = packet;
  return SecureIdentity.verify(fileOfferSigningData(unsignedPacket), packet.signature, peerSigningKey);
}

export function verifyFileComplete(packet: FileCompletePacket, peerSigningKey: string): boolean {
  const { signature: _signature, ...unsignedPacket } = packet;
  return SecureIdentity.verify(fileCompleteSigningData(unsignedPacket), packet.signature, peerSigningKey);
}
