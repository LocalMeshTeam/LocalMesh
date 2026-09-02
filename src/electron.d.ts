type DeviceIdentity = {
  device_id: string;
  device_name: string;
  display_name: string;
  created_at: string;
};

type LocalPeer = {
  device_id: string;
  device_name: string;
  display_name: string;
  address: string;
  transport_port: number;
  signing_public_key: string;
  exchange_public_key: string;
  last_seen: string;
};

type NetworkInfo = {
  addresses: string[];
  discovery_address: string;
  discovery_port: number;
  transport_port: number;
};

type Conversation = { conversation_id: string; peer_id: string; created_at: string; updated_at: string };
type Message = { message_id: string; conversation_id: string; sender_id: string; receiver_id: string; content: string; timestamp: string; status: string };
type TrustedPeer = { device_id: string; signing_public_key: string; fingerprint: string; trusted_at: string; revoked_at?: string };

interface Window {
  localmesh: {
    getAppInfo(): Promise<string>;
    getDeviceIdentity(): Promise<DeviceIdentity>;
    getNetworkInfo(): Promise<NetworkInfo>;
    listPeers(): Promise<LocalPeer[]>;
    listConversations(): Promise<Conversation[]>;
    createConversation(peerId: string): Promise<Conversation>;
    listMessages(conversationId: string): Promise<Message[]>;
    createMessage(conversationId: string, content: string): Promise<Message>;
    chooseAndSendFile(conversationId: string): Promise<unknown>;
    cancelFileTransfer(transferId: string): Promise<boolean>;
    openReceivedFile(transferId: string): Promise<string>;
    listTrustedPeers(): Promise<TrustedPeer[]>;
    trustPeer(deviceId: string): Promise<TrustedPeer>;
    revokePeer(deviceId: string): Promise<void>;
    onFileProgress(listener: (progress: { transfer_id: string; file_name?: string; transferred: number; total: number; status: string }) => void): () => void;
    onFileReceived(listener: (file: { transfer_id: string; file_name: string; path: string }) => void): () => void;
  };
}
