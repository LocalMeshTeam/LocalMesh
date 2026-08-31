type DeviceIdentity = {
  device_id: string;
  device_name: string;
  display_name: string;
  created_at: string;
};

interface Window {
  localmesh: {
    getAppInfo(): Promise<string>;
    getDeviceIdentity(): Promise<DeviceIdentity>;
  };
}
