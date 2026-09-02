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

interface Window {
  localmesh: {
    getAppInfo(): Promise<string>;
    getDeviceIdentity(): Promise<DeviceIdentity>;
    getNetworkInfo(): Promise<NetworkInfo>;
    listPeers(): Promise<LocalPeer[]>;
  };
}
