import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createConversation, createMessage, ensureConversation, listMessages, loadOrCreateIdentity, openDatabase, saveReceivedMessage, updateMessageStatus } from "./database.js";

test("database persists identity, conversations, messages, and statuses", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "localmesh-database-"));
  const database = openDatabase(directory);
  try {
    const identity = loadOrCreateIdentity(database);
    const reloadedIdentity = loadOrCreateIdentity(database);
    assert.equal(reloadedIdentity.device_id, identity.device_id);

    const conversation = createConversation(database, "peer-1");
    assert.equal(createConversation(database, "peer-1").conversation_id, conversation.conversation_id);
    const message = createMessage(database, conversation.conversation_id, identity.device_id, "hello");
    assert.equal(message.status, "pending");
    updateMessageStatus(database, message.message_id, "sent");
    assert.equal(listMessages(database, conversation.conversation_id)[0]?.status, "sent");

    const incomingConversation = ensureConversation(database, "incoming-conversation", "peer-2", new Date().toISOString());
    const incoming = { ...message, message_id: "incoming-1", conversation_id: incomingConversation.conversation_id, sender_id: "peer-2", receiver_id: identity.device_id, status: "pending" };
    assert.equal(saveReceivedMessage(database, incoming).status, "delivered");
    assert.equal(saveReceivedMessage(database, incoming).message_id, "incoming-1");
    assert.equal(listMessages(database, incomingConversation.conversation_id).length, 1);
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("database rejects invalid message input", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "localmesh-database-invalid-"));
  const database = openDatabase(directory);
  try {
    assert.throws(() => createConversation(database, "   "), /peerId is required/);
    assert.throws(() => createMessage(database, "missing", "sender", "hello"), /Conversation not found/);
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
