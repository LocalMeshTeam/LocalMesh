import dgram from "node:dgram";
import os from "node:os";

const MULTICAST_ADDRESS = "239.255.42.99";
const DISCOVERY_PORT = 45454;
const PROTOCOL_VERSION = 1;
const ANNOUNCEMENT_INTERVAL_MS = 5_000;
const PEER_TIMEOUT_MS = 15_000;

export type LocalPeer = {
  device_id: string;
  device_name: string;
  display_name: string;
  address: string;
  last_seen: string;
};

type DiscoveryPacket = {
  type: "localmesh-discovery";
  version: number;
  device_id: string;
  device_name: string;
  display_name: string;
};

export class PeerDiscovery {
  private readonly socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  private readonly peers = new Map<string, LocalPeer>();
  private announcementTimer: NodeJS.Timeout | undefined;
  private cleanupTimer: NodeJS.Timeout | undefined;
  private started = false;

  public constructor(private readonly identity: Omit<LocalPeer, "address" | "last_seen">) {
    this.socket.on("message", (message, remote) => this.handleMessage(message, remote.address));
    this.socket.on("error", (error) => console.error("LAN discovery socket error:", error));
  }

  public start(): void {
    if (this.started) return;
    this.started = true;
    this.socket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
      try {
        this.socket.addMembership(MULTICAST_ADDRESS);
        this.socket.setMulticastTTL(1);
        this.announce();
        this.announcementTimer = setInterval(() => this.announce(), ANNOUNCEMENT_INTERVAL_MS);
        this.cleanupTimer = setInterval(() => this.removeStalePeers(), ANNOUNCEMENT_INTERVAL_MS);
        console.log(`LAN discovery listening on ${MULTICAST_ADDRESS}:${DISCOVERY_PORT}`);
      } catch (error) {
        console.error("Failed to start LAN discovery:", error);
      }
    });
  }

  public listPeers(): LocalPeer[] {
    return [...this.peers.values()].sort((left, right) => right.last_seen.localeCompare(left.last_seen));
  }

  public stop(): void {
    if (!this.started) return;
    this.started = false;
    if (this.announcementTimer) clearInterval(this.announcementTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.announcementTimer = undefined;
    this.cleanupTimer = undefined;
    this.socket.close();
  }

  private announce(): void {
    const packet: DiscoveryPacket = {
      type: "localmesh-discovery",
      version: PROTOCOL_VERSION,
      ...this.identity,
    };
    const message = Buffer.from(JSON.stringify(packet));
    this.socket.send(message, DISCOVERY_PORT, MULTICAST_ADDRESS, (error) => {
      if (error) console.error("Failed to announce LocalMesh peer:", error);
    });
  }

  private handleMessage(message: Buffer, address: string): void {
    let packet: DiscoveryPacket;
    try {
      packet = JSON.parse(message.toString()) as DiscoveryPacket;
    } catch {
      return;
    }

    if (packet.type !== "localmesh-discovery" || packet.version !== PROTOCOL_VERSION || packet.device_id === this.identity.device_id) return;
    if (!packet.device_id || !packet.device_name || !packet.display_name) return;

    const peer: LocalPeer = {
      device_id: packet.device_id,
      device_name: packet.device_name,
      display_name: packet.display_name,
      address,
      last_seen: new Date().toISOString(),
    };
    const isNewPeer = !this.peers.has(peer.device_id);
    this.peers.set(peer.device_id, peer);
    if (isNewPeer) console.log(`Discovered LocalMesh peer ${peer.display_name} at ${peer.address}`);
  }

  private removeStalePeers(): void {
    const cutoff = Date.now() - PEER_TIMEOUT_MS;
    for (const [deviceId, peer] of this.peers) {
      if (Date.parse(peer.last_seen) < cutoff) {
        this.peers.delete(deviceId);
        console.log(`LocalMesh peer went offline: ${peer.display_name}`);
      }
    }
  }
}

export function getLocalAddresses(): string[] {
  return Object.values(os.networkInterfaces()).flatMap((interfaces) =>
    (interfaces ?? []).filter((network) => network.family === "IPv4" && !network.internal).map((network) => network.address),
  );
}
