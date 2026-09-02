import { strict as assert } from "node:assert";
import { test } from "node:test";
import { decodePacket, encodePacket, PROTOCOL_VERSION, type HelloPacket } from "./protocol.js";

test("protocol encodes and decodes a hello packet", () => {
  const packet: HelloPacket = {
    type: "hello", version: PROTOCOL_VERSION, device_id: "device-1", device_name: "PC-1",
    display_name: "User", signing_public_key: "signing-key", exchange_public_key: "exchange-key", signature: "signature",
  };
  assert.deepEqual(decodePacket(encodePacket(packet).trim()), packet);
});

test("protocol rejects malformed and unsupported packets", () => {
  assert.equal(decodePacket("not-json"), undefined);
  assert.equal(decodePacket(JSON.stringify({ type: "hello", version: 999 })), undefined);
  assert.equal(decodePacket(JSON.stringify({ type: "unknown", version: PROTOCOL_VERSION })), undefined);
});
