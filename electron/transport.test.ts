import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { SecureIdentity } from "./security.js";
import type { DeviceIdentity, Message } from "./database.js";
import { NetworkTransport } from "./transport.js";

test("transport delivers an encrypted message and acknowledgement", async () => {
  const firstDirectory = mkdtempSync(path.join(tmpdir(), "localmesh-transport-a-"));
  const secondDirectory = mkdtempSync(path.join(tmpdir(), "localmesh-transport-b-"));
  const firstIdentity: DeviceIdentity = { device_id: "device-a", device_name: "PC-A", display_name: "A", created_at: new Date().toISOString() };
  const secondIdentity: DeviceIdentity = { device_id: "device-b", device_name: "PC-B", display_name: "B", created_at: new Date().toISOString() };
  const firstSecurity = new SecureIdentity(firstDirectory);
  const secondSecurity = new SecureIdentity(secondDirectory);
  let resolveReceived!: (message: Message) => void;
  const received = new Promise<Message>((resolve) => { resolveReceived = resolve; });
  const secondTransport = new NetworkTransport(secondIdentity, secondSecurity, resolveReceived, () => undefined, 45501, "127.0.0.1");
  const firstTransport = new NetworkTransport(firstIdentity, firstSecurity, () => undefined, () => undefined, 45502, "127.0.0.1");
  try {
    secondTransport.start();
    firstTransport.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const message: Message = { message_id: "message-1", conversation_id: "conversation-1", sender_id: firstIdentity.device_id, receiver_id: secondIdentity.device_id, content: "encrypted hello", timestamp: new Date().toISOString(), status: "pending" };
    const delivery = firstTransport.sendMessage({ device_id: secondIdentity.device_id, address: "127.0.0.1", transport_port: 45501, signing_public_key: secondSecurity.signingPublicKey, exchange_public_key: secondSecurity.exchangePublicKey }, message);
    const [delivered] = await Promise.all([received, delivery]);
    assert.equal(delivered.content, message.content);
    assert.equal(delivered.message_id, message.message_id);
  } finally {
    firstTransport.stop();
    secondTransport.stop();
    rmSync(firstDirectory, { recursive: true, force: true });
    rmSync(secondDirectory, { recursive: true, force: true });
  }
});

test("transport keeps independent connections for multiple peers", async () => {
  const directories = [1, 2, 3].map((value) => mkdtempSync(path.join(tmpdir(), `localmesh-transport-${value}-`)));
  const identities: DeviceIdentity[] = [1, 2, 3].map((value) => ({ device_id: `device-${value}`, device_name: `PC-${value}`, display_name: `User-${value}`, created_at: new Date().toISOString() }));
  const securities = directories.map((directory) => new SecureIdentity(directory));
  const received: Message[] = [];
  const transports = identities.map((identity, index) => new NetworkTransport(identity, securities[index], (message) => received.push(message), () => undefined, 45510 + index, "127.0.0.1"));
  try {
    transports.forEach((transport) => transport.start());
    await new Promise((resolve) => setTimeout(resolve, 50));
    const messages = identities.slice(1).map((identity, index) => ({
      message_id: `message-${index + 1}`,
      conversation_id: `conversation-${index + 1}`,
      sender_id: identity.device_id,
      receiver_id: identities[0].device_id,
      content: `hello from ${identity.device_id}`,
      timestamp: new Date().toISOString(),
      status: "pending",
    } satisfies Message));
    await Promise.all(messages.map((message, index) => transports[index + 1].sendMessage({
      device_id: identities[0].device_id,
      address: "127.0.0.1",
      transport_port: 45510,
      signing_public_key: securities[0].signingPublicKey,
      exchange_public_key: securities[0].exchangePublicKey,
    }, message)));
    const reply: Message = {
      message_id: "message-3",
      conversation_id: "conversation-reply",
      sender_id: identities[0].device_id,
      receiver_id: identities[1].device_id,
      content: "reply from device-1",
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    await transports[0].sendMessage({
      device_id: identities[1].device_id,
      address: "127.0.0.1",
      transport_port: 45511,
      signing_public_key: securities[1].signingPublicKey,
      exchange_public_key: securities[1].exchangePublicKey,
    }, reply);
    assert.deepEqual(received.map((message) => message.message_id).sort(), ["message-1", "message-2", "message-3"]);
  } finally {
    transports.forEach((transport) => transport.stop());
    directories.forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  }
});
