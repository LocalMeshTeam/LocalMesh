import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { SecureIdentity } from "./security.js";
import { TrustedPeerStore } from "./trust.js";

test("trusted peers persist and detect key changes", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "localmesh-trust-"));
  try {
    const firstKey = new SecureIdentity(path.join(directory, "first")).signingPublicKey;
    const secondKey = new SecureIdentity(path.join(directory, "second")).signingPublicKey;
    const filePath = path.join(directory, "trusted-peers.json");
    const store = new TrustedPeerStore(filePath);

    assert.equal(store.check("peer-1", firstKey), "unknown");
    const trusted = store.trust("peer-1", firstKey);
    assert.equal(trusted.device_id, "peer-1");
    assert.equal(store.check("peer-1", firstKey), "trusted");
    assert.equal(store.check("peer-1", secondKey), "rejected");

    const reloaded = new TrustedPeerStore(filePath);
    assert.equal(reloaded.list().length, 1);
    assert.equal(reloaded.list()[0]?.fingerprint, trusted.fingerprint);
    reloaded.revoke("peer-1");
    assert.equal(reloaded.list().length, 0);
    assert.equal(reloaded.check("peer-1", firstKey), "rejected");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
