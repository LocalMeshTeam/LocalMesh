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
