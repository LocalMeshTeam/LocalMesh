import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localmesh", {
  getAppInfo: (): Promise<string> => ipcRenderer.invoke("get-app-info"),
  getDeviceIdentity: () => ipcRenderer.invoke("get-device-identity"),
});
