export const PROTOCOL_VERSION = 1;

export type HelloPacket = {
  type: "hello";
  version: number;
  device_id: string;
  device_name: string;
  display_name: string;
  signing_public_key: string;
  exchange_public_key: string;
  signature: string;
};

export type MessagePacket = {
  type: "message";
  version: number;
  message_id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  timestamp: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  signature: string;
};

export type AckPacket = {
  type: "ack";
  version: number;
  message_id: string;
};

export type FileOfferPacket = {
  type: "file-offer";
  version: number;
  transfer_id: string;
  sender_id: string;
  receiver_id: string;
  file_name: string;
  size: number;
  checksum: string;
  timestamp: string;
  signature: string;
};

export type FileChunkPacket = {
  type: "file-chunk";
  version: number;
  transfer_id: string;
  offset: number;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  signature: string;
};

export type FileCompletePacket = {
  type: "file-complete";
  version: number;
  transfer_id: string;
  checksum: string;
  signature: string;
};

export type FileAckPacket = { type: "file-ack"; version: number; transfer_id: string; offset: number; accepted: boolean };

export type NetworkPacket = HelloPacket | MessagePacket | AckPacket | FileOfferPacket | FileChunkPacket | FileCompletePacket | FileAckPacket;

export function encodePacket(packet: NetworkPacket): string {
  return `${JSON.stringify(packet)}\n`;
}

export function helloSigningData(packet: Omit<HelloPacket, "signature">): string {
  return [packet.type, packet.version, packet.device_id, packet.device_name, packet.display_name, packet.signing_public_key, packet.exchange_public_key].join("|");
}

export function messageSigningData(packet: Omit<MessagePacket, "signature">): string {
  return [packet.type, packet.version, packet.message_id, packet.conversation_id, packet.sender_id, packet.receiver_id, packet.timestamp, packet.ciphertext, packet.iv, packet.auth_tag].join("|");
}

export function fileOfferSigningData(packet: Omit<FileOfferPacket, "signature">): string {
  return [packet.type, packet.version, packet.transfer_id, packet.sender_id, packet.receiver_id, packet.file_name, packet.size, packet.checksum, packet.timestamp].join("|");
}

export function fileChunkSigningData(packet: Omit<FileChunkPacket, "signature">): string {
  return [packet.type, packet.version, packet.transfer_id, packet.offset, packet.ciphertext, packet.iv, packet.auth_tag].join("|");
}

export function fileCompleteSigningData(packet: Omit<FileCompletePacket, "signature">): string {
  return [packet.type, packet.version, packet.transfer_id, packet.checksum].join("|");
}

export function decodePacket(line: string): NetworkPacket | undefined {
  try {
    const value = JSON.parse(line) as Partial<NetworkPacket>;
    if (value.version !== PROTOCOL_VERSION || typeof value.type !== "string") return undefined;
    if (value.type === "hello" && typeof value.device_id === "string" && typeof value.device_name === "string" && typeof value.display_name === "string" && typeof value.signing_public_key === "string" && typeof value.exchange_public_key === "string" && typeof value.signature === "string") return value as HelloPacket;
    if (value.type === "message" && typeof value.message_id === "string" && typeof value.conversation_id === "string" && typeof value.sender_id === "string" && typeof value.receiver_id === "string" && typeof value.timestamp === "string" && typeof value.ciphertext === "string" && typeof value.iv === "string" && typeof value.auth_tag === "string" && typeof value.signature === "string") return value as MessagePacket;
    if (value.type === "ack" && typeof value.message_id === "string") return value as AckPacket;
    if (value.type === "file-offer" && typeof value.transfer_id === "string" && typeof value.sender_id === "string" && typeof value.receiver_id === "string" && typeof value.file_name === "string" && Number.isSafeInteger(value.size) && (value.size as number) >= 0 && typeof value.checksum === "string" && typeof value.timestamp === "string" && typeof value.signature === "string") return value as FileOfferPacket;
    if (value.type === "file-chunk" && typeof value.transfer_id === "string" && Number.isSafeInteger(value.offset) && (value.offset as number) >= 0 && typeof value.ciphertext === "string" && typeof value.iv === "string" && typeof value.auth_tag === "string" && typeof value.signature === "string") return value as FileChunkPacket;
    if (value.type === "file-complete" && typeof value.transfer_id === "string" && typeof value.checksum === "string" && typeof value.signature === "string") return value as FileCompletePacket;
    if (value.type === "file-ack" && typeof value.transfer_id === "string" && Number.isSafeInteger(value.offset) && typeof value.accepted === "boolean") return value as FileAckPacket;
  } catch {
    return undefined;
  }
  return undefined;
}
