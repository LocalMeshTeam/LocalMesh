import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { clearConversationFiles, clearConversationMessages, createConversation, createMessage, deleteConversation, deleteFileMessage, deleteMessage, ensureConversation, listFileMessages, listMessages, loadOrCreateIdentity, openDatabase, saveFileMessage, saveReceivedMessage, updateMessageStatus } from "./database.js";

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
    assert.equal(deleteMessage(database, message.message_id), true);
    assert.equal(deleteMessage(database, message.message_id), false);
    const secondMessage = createMessage(database, conversation.conversation_id, identity.device_id, "second");
    assert.equal(clearConversationMessages(database, conversation.conversation_id), 1);
    assert.equal(listMessages(database, conversation.conversation_id).length, 0);
    assert.equal(deleteMessage(database, secondMessage.message_id), false);
    saveFileMessage(database, { transfer_id: "file-1", conversation_id: conversation.conversation_id, sender_id: identity.device_id, receiver_id: "peer-1", file_name: "resume.html", timestamp: new Date().toISOString(), status: "sent" });
    assert.equal(listFileMessages(database, conversation.conversation_id).length, 1);
    assert.equal(deleteFileMessage(database, "file-1"), true);
    assert.equal(deleteFileMessage(database, "file-1"), false);
    saveFileMessage(database, { transfer_id: "file-2", conversation_id: conversation.conversation_id, sender_id: identity.device_id, receiver_id: "peer-1", file_name: "notes.txt", timestamp: new Date().toISOString(), status: "sent" });
    assert.deepEqual(clearConversationFiles(database, conversation.conversation_id), ["file-2"]);

    const incomingConversation = ensureConversation(database, "incoming-conversation", "peer-2", new Date().toISOString());
    const samePeerConversation = ensureConversation(database, "different-conversation-id", "peer-2", new Date().toISOString());
    assert.equal(samePeerConversation.conversation_id, incomingConversation.conversation_id);
    const incoming = { ...message, message_id: "incoming-1", conversation_id: incomingConversation.conversation_id, sender_id: "peer-2", receiver_id: identity.device_id, status: "pending" };
    assert.equal(saveReceivedMessage(database, incoming).status, "delivered");
    assert.equal(saveReceivedMessage(database, incoming).message_id, "incoming-1");
    assert.equal(listMessages(database, incomingConversation.conversation_id).length, 1);
    saveFileMessage(database, { transfer_id: "file-delete", conversation_id: incomingConversation.conversation_id, sender_id: "peer-2", receiver_id: identity.device_id, file_name: "old.png", timestamp: new Date().toISOString(), status: "received" });
    assert.deepEqual(deleteConversation(database, incomingConversation.conversation_id), ["file-delete"]);
    assert.equal(listMessages(database, incomingConversation.conversation_id).length, 0);
    assert.equal(listFileMessages(database, incomingConversation.conversation_id).length, 0);
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
    assert.throws(() => deleteMessage(database, "   "), /messageId is required/);
    assert.throws(() => clearConversationMessages(database, "   "), /conversationId is required/);
    assert.throws(() => deleteConversation(database, "   "), /conversationId is required/);
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
