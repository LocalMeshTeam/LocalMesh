import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localmesh", {
  getAppInfo: (): Promise<string> => ipcRenderer.invoke("get-app-info"),
  getDeviceIdentity: () => ipcRenderer.invoke("get-device-identity"),
  getNetworkInfo: () => ipcRenderer.invoke("get-network-info"),
  listPeers: () => ipcRenderer.invoke("list-peers"),
  listConversations: () => ipcRenderer.invoke("list-conversations"),
  createConversation: (peerId: string) => ipcRenderer.invoke("create-conversation", peerId),
  listMessages: (conversationId: string) => ipcRenderer.invoke("list-messages", conversationId),
  createMessage: (conversationId: string, content: string) => ipcRenderer.invoke("create-message", conversationId, content),
  chooseAndSendFile: (conversationId: string) => ipcRenderer.invoke("choose-and-send-file", conversationId),
  cancelFileTransfer: (transferId: string) => ipcRenderer.invoke("cancel-file-transfer", transferId),
  openReceivedFile: (transferId: string) => ipcRenderer.invoke("open-received-file", transferId),
  listTrustedPeers: () => ipcRenderer.invoke("list-trusted-peers"),
  trustPeer: (deviceId: string) => ipcRenderer.invoke("trust-peer", deviceId),
  revokePeer: (deviceId: string) => ipcRenderer.invoke("revoke-peer", deviceId),
  onFileProgress: (listener: (progress: { transfer_id: string; file_name?: string; transferred: number; total: number; status: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: { transfer_id: string; file_name?: string; transferred: number; total: number; status: string }) => listener(progress);
    ipcRenderer.on("file-progress", handler);
    return () => ipcRenderer.removeListener("file-progress", handler);
  },
  onFileReceived: (listener: (file: { transfer_id: string; file_name: string; path: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, file: { transfer_id: string; file_name: string; path: string }) => listener(file);
    ipcRenderer.on("file-received", handler);
    return () => ipcRenderer.removeListener("file-received", handler);
  },
});
