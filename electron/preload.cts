import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localmesh", {
  getAppInfo: (): Promise<string> => ipcRenderer.invoke("get-app-info"),
  getDeviceIdentity: () => ipcRenderer.invoke("get-device-identity"),
  listConversations: () => ipcRenderer.invoke("list-conversations"),
  createConversation: (peerId: string) => ipcRenderer.invoke("create-conversation", peerId),
  listMessages: (conversationId: string) => ipcRenderer.invoke("list-messages", conversationId),
  createMessage: (conversationId: string, content: string) => ipcRenderer.invoke("create-message", conversationId, content),
});
