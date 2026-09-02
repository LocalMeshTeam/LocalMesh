import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { SecureIdentity } from "./security.js";

test("secure identity persists keys and fingerprint", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "localmesh-security-"));
  try {
    const first = new SecureIdentity(directory);
    const second = new SecureIdentity(directory);
    assert.equal(first.fingerprint, second.fingerprint);
    assert.equal(SecureIdentity.verify("hello", first.sign("hello"), first.signingPublicKey), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("two secure identities can encrypt and decrypt a payload", () => {
  const firstDirectory = mkdtempSync(path.join(tmpdir(), "localmesh-security-a-"));
  const secondDirectory = mkdtempSync(path.join(tmpdir(), "localmesh-security-b-"));
  try {
    const first = new SecureIdentity(firstDirectory);
    const second = new SecureIdentity(secondDirectory);
    const encrypted = first.encrypt("secret LAN message", second.exchangePublicKey);
    assert.equal(second.decrypt(encrypted, first.exchangePublicKey), "secret LAN message");
  } finally {
    rmSync(firstDirectory, { recursive: true, force: true });
    rmSync(secondDirectory, { recursive: true, force: true });
  }
});
