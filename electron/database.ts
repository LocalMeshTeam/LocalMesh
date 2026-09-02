import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type BetterSqlite3 from "better-sqlite3";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3") as typeof BetterSqlite3;
type SQLiteDatabase = InstanceType<typeof Database>;
const MAX_PEER_ID_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 10_000;

function requiredText(value: string, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  const result = value.trim();
  if (result.length > maxLength) throw new Error(`${field} is too long`);
  return result;
}

export type DeviceIdentity = {
  device_id: string;
  device_name: string;
  display_name: string;
  created_at: string;
};

export type Conversation = {
  conversation_id: string;
  peer_id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  status: string;
};

export function openDatabase(userDataPath: string): SQLiteDatabase {
  mkdirSync(userDataPath, { recursive: true });
  const database = new Database(path.join(userDataPath, "localmesh.db"));
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS device_identity (
      device_id TEXT PRIMARY KEY NOT NULL, device_name TEXT NOT NULL,
      display_name TEXT NOT NULL, created_at TEXT NOT NULL
    );
    INSERT OR IGNORE INTO schema_migrations (version, applied_at)
      VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
    CREATE TABLE IF NOT EXISTS conversations (
      conversation_id TEXT PRIMARY KEY NOT NULL, peer_id TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, content TEXT NOT NULL,
      timestamp TEXT NOT NULL, status TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    INSERT OR IGNORE INTO schema_migrations (version, applied_at)
      VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
    INSERT OR IGNORE INTO schema_migrations (version, applied_at)
      VALUES (3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `);
  return database;
}

export function loadOrCreateIdentity(database: SQLiteDatabase): DeviceIdentity {
  const existing = database.prepare("SELECT device_id, device_name, display_name, created_at FROM device_identity LIMIT 1").get() as DeviceIdentity | undefined;
  if (existing) {
    const deviceName = os.hostname();
    const displayName = os.userInfo().username;
    const hasLegacyDefaults = existing.device_name === "LOCALMESH-PC" && existing.display_name === "LocalMesh User";
    if (hasLegacyDefaults) {
      database.prepare("UPDATE device_identity SET device_name = ?, display_name = ? WHERE device_id = ?")
        .run(deviceName, displayName, existing.device_id);
      return { ...existing, device_name: deviceName, display_name: displayName };
    }
    return existing;
  }

  const identity: DeviceIdentity = {
    device_id: crypto.randomUUID(),
    device_name: os.hostname(),
    display_name: os.userInfo().username,
    created_at: new Date().toISOString(),
  };
  database.prepare("INSERT INTO device_identity (device_id, device_name, display_name, created_at) VALUES (?, ?, ?, ?)")
    .run(identity.device_id, identity.device_name, identity.display_name, identity.created_at);
  return identity;
}

export function listConversations(database: SQLiteDatabase): Conversation[] {
  return database.prepare("SELECT conversation_id, peer_id, created_at, updated_at FROM conversations ORDER BY updated_at DESC").all() as Conversation[];
}

export function createConversation(database: SQLiteDatabase, peerId: string): Conversation {
  peerId = requiredText(peerId, "peerId", MAX_PEER_ID_LENGTH);
  const existing = database.prepare("SELECT conversation_id, peer_id, created_at, updated_at FROM conversations WHERE peer_id = ? LIMIT 1").get(peerId) as Conversation | undefined;
  if (existing) return existing;
  const now = new Date().toISOString();
  const conversation: Conversation = {
    conversation_id: crypto.randomUUID(),
    peer_id: peerId,
    created_at: now,
    updated_at: now,
  };
  database.prepare("INSERT INTO conversations (conversation_id, peer_id, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(conversation.conversation_id, conversation.peer_id, conversation.created_at, conversation.updated_at);
  return conversation;
}

export function ensureConversation(database: SQLiteDatabase, conversationId: string, peerId: string, createdAt: string): Conversation {
  conversationId = requiredText(conversationId, "conversationId", 255);
  peerId = requiredText(peerId, "peerId", MAX_PEER_ID_LENGTH);
  createdAt = requiredText(createdAt, "createdAt", 64);
  const existing = database.prepare("SELECT conversation_id, peer_id, created_at, updated_at FROM conversations WHERE conversation_id = ?").get(conversationId) as Conversation | undefined;
  if (existing) return existing;
  database.prepare("INSERT INTO conversations (conversation_id, peer_id, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(conversationId, peerId, createdAt, createdAt);
  return { conversation_id: conversationId, peer_id: peerId, created_at: createdAt, updated_at: createdAt };
}

export function listMessages(database: SQLiteDatabase, conversationId: string): Message[] {
  conversationId = requiredText(conversationId, "conversationId", 255);
  return database.prepare("SELECT message_id, conversation_id, sender_id, receiver_id, content, timestamp, status FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC")
    .all(conversationId) as Message[];
}

export function createMessage(database: SQLiteDatabase, conversationId: string, senderId: string, content: string): Message {
  conversationId = requiredText(conversationId, "conversationId", 255);
  senderId = requiredText(senderId, "senderId", 255);
  content = requiredText(content, "content", MAX_MESSAGE_LENGTH);
  const conversation = database.prepare("SELECT peer_id FROM conversations WHERE conversation_id = ?").get(conversationId) as { peer_id: string } | undefined;
  if (!conversation) throw new Error("Conversation not found");
  const message: Message = {
    message_id: crypto.randomUUID(), conversation_id: conversationId, sender_id: senderId,
    receiver_id: conversation.peer_id, content, timestamp: new Date().toISOString(), status: "pending",
  };
  database.prepare("INSERT INTO messages (message_id, conversation_id, sender_id, receiver_id, content, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(message.message_id, message.conversation_id, message.sender_id, message.receiver_id, message.content, message.timestamp, message.status);
  database.prepare("UPDATE conversations SET updated_at = ? WHERE conversation_id = ?").run(message.timestamp, conversationId);
  return message;
}

export function updateMessageStatus(database: SQLiteDatabase, messageId: string, status: "pending" | "sent" | "delivered" | "failed"): void {
  messageId = requiredText(messageId, "messageId", 255);
  database.prepare("UPDATE messages SET status = ? WHERE message_id = ?").run(status, messageId);
}

export function saveReceivedMessage(database: SQLiteDatabase, message: Message): Message {
  const conversation = database.prepare("SELECT conversation_id FROM conversations WHERE conversation_id = ?").get(message.conversation_id) as { conversation_id: string } | undefined;
  if (!conversation) throw new Error("Conversation not found for received message");
  const existing = database.prepare("SELECT message_id, conversation_id, sender_id, receiver_id, content, timestamp, status FROM messages WHERE message_id = ?").get(message.message_id) as Message | undefined;
  if (existing) return existing;
  const receivedMessage = { ...message, status: "delivered" } as Message;
  database.prepare("INSERT INTO messages (message_id, conversation_id, sender_id, receiver_id, content, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(receivedMessage.message_id, receivedMessage.conversation_id, receivedMessage.sender_id, receivedMessage.receiver_id, receivedMessage.content, receivedMessage.timestamp, receivedMessage.status);
  database.prepare("UPDATE conversations SET updated_at = ? WHERE conversation_id = ?").run(receivedMessage.timestamp, receivedMessage.conversation_id);
  return receivedMessage;
}
