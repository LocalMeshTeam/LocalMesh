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
  listTrustedPeers: () => ipcRenderer.invoke("list-trusted-peers"),
  trustPeer: (deviceId: string) => ipcRenderer.invoke("trust-peer", deviceId),
  revokePeer: (deviceId: string) => ipcRenderer.invoke("revoke-peer", deviceId),
});
