import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createFileChunk, createFileComplete, createFileOffer, decryptFileChunk, verifyFileComplete, verifyFileOffer } from "./file-transfer.js";
import { SecureIdentity } from "./security.js";

test("file transfer creates signed offers and encrypted chunks", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "localmesh-file-transfer-"));
  try {
    const sender = new SecureIdentity(path.join(directory, "sender"));
    const receiver = new SecureIdentity(path.join(directory, "receiver"));
    const identity = { device_id: "sender", device_name: "PC-A", display_name: "A", created_at: new Date().toISOString() };
    const content = Buffer.from("private file chunk");
    const offer = createFileOffer(identity, sender, "transfer-1", "receiver", "notes.txt", content);
    assert.equal(verifyFileOffer(offer, sender.signingPublicKey), true);
    const chunk = createFileChunk(sender, "transfer-1", 0, content, receiver.exchangePublicKey);
    assert.deepEqual(decryptFileChunk(receiver, chunk, sender.signingPublicKey, sender.exchangePublicKey), content);
    const complete = createFileComplete(sender, "transfer-1", offer.checksum);
    assert.equal(verifyFileComplete(complete, sender.signingPublicKey), true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
