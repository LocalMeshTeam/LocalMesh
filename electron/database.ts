import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export type DeviceIdentity = {
  device_id: string;
  device_name: string;
  display_name: string;
  created_at: string;
};

export function openDatabase(userDataPath: string): Database.Database {
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
  `);
  return database;
}

export function loadOrCreateIdentity(database: Database.Database): DeviceIdentity {
  const existing = database.prepare("SELECT device_id, device_name, display_name, created_at FROM device_identity LIMIT 1").get() as DeviceIdentity | undefined;
  if (existing) return existing;

  const identity: DeviceIdentity = {
    device_id: crypto.randomUUID(),
    device_name: "LOCALMESH-PC",
    display_name: "LocalMesh User",
    created_at: new Date().toISOString(),
  };
  database.prepare("INSERT INTO device_identity (device_id, device_name, display_name, created_at) VALUES (?, ?, ?, ?)")
    .run(identity.device_id, identity.device_name, identity.display_name, identity.created_at);
  return identity;
}
