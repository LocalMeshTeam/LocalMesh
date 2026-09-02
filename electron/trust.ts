import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type TrustedPeer = {
  device_id: string;
  signing_public_key: string;
  fingerprint: string;
  trusted_at: string;
  revoked_at?: string;
};

export class TrustedPeerStore {
  private readonly peers = new Map<string, TrustedPeer>();

  public constructor(private readonly filePath: string) {
    this.load();
  }

  public list(): TrustedPeer[] {
    return [...this.peers.values()].filter((peer) => !peer.revoked_at);
  }

  public trust(deviceId: string, signingPublicKey: string): TrustedPeer {
    const current = this.peers.get(deviceId);
    if (current && !current.revoked_at && current.signing_public_key !== signingPublicKey) throw new Error("Peer key changed; revoke the old trust record before trusting the new key");
    const peer: TrustedPeer = {
      device_id: deviceId,
      signing_public_key: signingPublicKey,
      fingerprint: createHash("sha256").update(Buffer.from(signingPublicKey, "base64")).digest("hex").slice(0, 32),
      trusted_at: current?.trusted_at ?? new Date().toISOString(),
    };
    this.peers.set(deviceId, peer);
    this.save();
    return peer;
  }

  public revoke(deviceId: string): void {
    const current = this.peers.get(deviceId);
    if (!current) return;
    this.peers.set(deviceId, { ...current, revoked_at: new Date().toISOString() });
    this.save();
  }

  public check(deviceId: string, signingPublicKey: string): "trusted" | "unknown" | "rejected" {
    const current = this.peers.get(deviceId);
    if (!current) return "unknown";
    if (current.revoked_at || current.signing_public_key !== signingPublicKey) return "rejected";
    return "trusted";
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const records = JSON.parse(readFileSync(this.filePath, "utf8")) as TrustedPeer[];
      for (const peer of records) this.peers.set(peer.device_id, peer);
    } catch (error) {
      console.error("Failed to load trusted peers:", error);
    }
  }

  private save(): void {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify([...this.peers.values()], null, 2), "utf8");
  }
}

export function trustedPeersPath(securityDirectory: string): string {
  return path.join(securityDirectory, "trusted-peers.json");
}
