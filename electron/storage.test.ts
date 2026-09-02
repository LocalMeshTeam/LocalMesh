import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FileStorage } from "./storage.js";

test("file storage writes chunks and verifies checksum", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "localmesh-storage-"));
  try {
    const content = Buffer.from("LocalMesh file transfer");
    const checksum = createHash("sha256").update(content).digest("hex");
    const storage = new FileStorage(directory);
    storage.createTransfer("file-1", "notes.txt", content.length, checksum);
    storage.writeChunk("file-1", 0, content.subarray(0, 9));
    storage.writeChunk("file-1", 9, content.subarray(9));
    assert.deepEqual(storage.read("file-1"), content);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("file storage rejects unsafe names and invalid chunks", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "localmesh-storage-invalid-"));
  try {
    const storage = new FileStorage(directory);
    assert.throws(() => storage.createTransfer("file-1", "../secret.txt", 1, "0".repeat(64)), /Invalid file name/);
    storage.createTransfer("file-2", "safe.txt", 2, "0".repeat(64));
    assert.throws(() => storage.writeChunk("file-2", 1, Buffer.from("too long")), /outside the expected range/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
