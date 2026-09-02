import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseDiscoveryPacket } from "./discovery.js";

const validPacket = {
  type: "localmesh-discovery",
  version: 1,
  device_id: "peer-1",
  device_name: "PC-1",
  display_name: "User 1",
  transport_port: 45455,
  signing_public_key: "signing-key",
  exchange_public_key: "exchange-key",
};

test("discovery parser accepts a valid remote peer", () => {
  const peer = parseDiscoveryPacket(JSON.stringify(validPacket), "local-device", "192.168.1.20");
  assert.equal(peer?.device_id, "peer-1");
  assert.equal(peer?.address, "192.168.1.20");
  assert.equal(peer?.transport_port, 45455);
  assert.ok(peer?.last_seen);
});

test("discovery parser rejects malformed, self, and invalid packets", () => {
  assert.equal(parseDiscoveryPacket("not-json", "local-device", "192.168.1.20"), undefined);
  assert.equal(parseDiscoveryPacket(JSON.stringify({ ...validPacket, device_id: "local-device" }), "local-device", "192.168.1.20"), undefined);
  assert.equal(parseDiscoveryPacket(JSON.stringify({ ...validPacket, version: 2 }), "local-device", "192.168.1.20"), undefined);
  assert.equal(parseDiscoveryPacket(JSON.stringify({ ...validPacket, transport_port: 70000 }), "local-device", "192.168.1.20"), undefined);
  assert.equal(parseDiscoveryPacket(JSON.stringify({ ...validPacket, signing_public_key: "" }), "local-device", "192.168.1.20"), undefined);
});
