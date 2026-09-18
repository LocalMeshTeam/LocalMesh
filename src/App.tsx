import { useCallback, useEffect, useState } from "react";
import "./App.css";

type IconName = "paperclip" | "send" | "trash" | "broom";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    paperclip: "M7.5 12.5 14 6a3.5 3.5 0 0 1 5 5l-8 8a5 5 0 0 1-7-7l8-8a2.5 2.5 0 0 1 3.5 3.5l-7.5 7.5a1.5 1.5 0 0 1-2-2L13 6",
    send: "m21 3-7.5 18-3.5-8-8-3.5L21 3Zm0 0L10 13",
    trash: "M5 7h14m-9 4v5m4-5v5M9 7V4h6v3m-8 0 1 14h6l1-14",
    broom: "m4 20 5.5-5.5m-2-2L15 5l4 4-7.5 7.5m-5-1L3 20h6",
  };
  return <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function App() {
  const [identity, setIdentity] = useState<DeviceIdentity | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [peers, setPeers] = useState<LocalPeer[]>([]);
  const [trusted, setTrusted] = useState<TrustedPeer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fileSending, setFileSending] = useState(false);
  const [fileProgress, setFileProgress] = useState<{ transfer_id: string; file_name?: string; transferred: number; total: number; status: string; conversation_id?: string; sender_id?: string; receiver_id?: string } | null>(null);
  const [fileMessages, setFileMessages] = useState<FileMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshPeers = useCallback(() => window.localmesh.listPeers().then(setPeers).catch((reason) => setError(String(reason))), []);
  const refreshConversations = useCallback(() => window.localmesh.listConversations().then(setConversations).catch((reason) => setError(String(reason))), []);
  const refreshTrusted = useCallback(() => window.localmesh.listTrustedPeers().then(setTrusted).catch((reason) => setError(String(reason))), []);

  useEffect(() => {
    if (!window.localmesh) { setError("Electron runtime is unavailable. Start the app with `bun run dev`."); return; }
    Promise.all([
      window.localmesh.getDeviceIdentity().then(setIdentity),
      window.localmesh.getNetworkInfo().then(setNetwork),
      refreshConversations(),
      refreshPeers(), refreshTrusted(),
    ]).catch((reason) => setError(String(reason))).finally(() => setLoading(false));
    const timer = window.setInterval(() => { void refreshPeers(); void refreshConversations(); }, 5_000);
    return () => window.clearInterval(timer);
  }, [refreshConversations, refreshPeers, refreshTrusted]);

  useEffect(() => {
    if (!window.localmesh) return;
    const removeProgress = window.localmesh.onFileProgress((progress) => setFileProgress(progress));
    const removeReceived = window.localmesh.onFileReceived((file) => setFileMessages((current) => [file, ...current.filter((item) => item.transfer_id !== file.transfer_id)]));
    return () => { removeProgress(); removeReceived(); };
  }, []);

  useEffect(() => {
    setMessages([]);
    setFileMessages([]);
    if (!selected) return;
    let active = true;
    const conversationId = selected.conversation_id;
    const loadMessages = () => Promise.all([window.localmesh.listMessages(conversationId), window.localmesh.listFileMessages(conversationId)]).then(([incoming, files]) => {
      if (!active) return;
      setMessages((current) => Array.from(new Map([...current, ...incoming].map((message) => [message.message_id, message])).values()));
      setFileMessages(files);
    }).catch((reason) => { if (active) setError(String(reason)); });
    void loadMessages();
    const timer = window.setInterval(() => { void loadMessages(); }, 2_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selected?.conversation_id]);

  const openConversation = async (peerId: string) => {
    try { const conversation = await window.localmesh.createConversation(peerId); setConversations(await window.localmesh.listConversations()); setSelected(conversation); }
    catch (reason) { setError(String(reason)); }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      const message = await window.localmesh.createMessage(selected.conversation_id, draft);
      setMessages((current) => Array.from(new Map([...current, message].map((item) => [item.message_id, item])).values()));
      setDraft(""); setError("");
    }
    catch (reason) { setError(String(reason)); }
    finally { setSending(false); }
  };

  const removeMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message from this device?")) return;
    try {
      await window.localmesh.deleteMessage(messageId);
      setMessages((current) => current.filter((message) => message.message_id !== messageId));
      setError("");
    } catch (reason) { setError(String(reason)); }
  };

  const clearChat = async () => {
    if (!selected || (!messages.length && !fileMessages.length) || !window.confirm("Clear every message and file in this chat from this device?")) return;
    try {
      await window.localmesh.clearConversation(selected.conversation_id);
      setMessages([]); setFileMessages([]); setError("");
    } catch (reason) { setError(String(reason)); }
  };

  const deleteConversation = async (conversation: Conversation) => {
    const name = peerLabel(conversation.peer_id);
    if (!window.confirm(`Delete the conversation with ${name}? This removes its messages and received files from this device.`)) return;
    try {
      await window.localmesh.deleteConversation(conversation.conversation_id);
      const remaining = conversations.filter((item) => item.conversation_id !== conversation.conversation_id);
      setConversations(remaining);
      if (selected?.conversation_id === conversation.conversation_id) setSelected(null);
      setError("");
    } catch (reason) { setError(String(reason)); }
  };

  const removeFile = async (transferId: string) => {
    if (!window.confirm("Delete this file from this device?")) return;
    try {
      await window.localmesh.deleteFile(transferId);
      setFileMessages((current) => current.filter((file) => file.transfer_id !== transferId));
      setError("");
    } catch (reason) { setError(String(reason)); }
  };

  const openFile = async (transferId: string) => {
    try { await window.localmesh.openReceivedFile(transferId); setError(""); }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message.replace(/^Error invoking remote method '[^']+': Error: /, ""));
    }
  };

  const trustPeer = async (deviceId: string) => {
    try {
      const currentPeers = await window.localmesh.listPeers();
      setPeers(currentPeers);
      if (!currentPeers.some((peer) => peer.device_id === deviceId)) throw new Error("That device is no longer visible. Click Rescan devices and try again.");
      await window.localmesh.trustPeer(deviceId);
      await refreshTrusted();
      setError("");
    }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message.replace(/^Error invoking remote method '[^']+': Error: /, ""));
    }
  };

  const sendFile = async () => {
    if (!selected) return;
    setFileSending(true); setFileProgress(null); setError("");
    try {
      const file = await window.localmesh.chooseAndSendFile(selected.conversation_id);
      setFileMessages(await window.localmesh.listFileMessages(selected.conversation_id));
      if (!file) setError("");
    } catch (reason) { setError(String(reason)); }
    finally { setFileSending(false); }
  };

  const cancelFile = async () => {
    if (!fileProgress) return;
    await window.localmesh.cancelFileTransfer(fileProgress.transfer_id);
    setFileSending(false);
  };

  const revokePeer = async (deviceId: string) => {
    const peer = peers.find((candidate) => candidate.device_id === deviceId);
    if (!window.confirm(`Revoke trust for ${peer?.display_name || deviceId}?`)) return;
    try { await window.localmesh.revokePeer(deviceId); await refreshTrusted(); }
    catch (reason) { setError(String(reason)); }
  };

  const peerLabel = (peerId: string) => peers.find((peer) => peer.device_id === peerId)?.device_name || conversations.find((conversation) => conversation.peer_id === peerId)?.peer_name || peers.find((peer) => peer.device_id === peerId)?.display_name || conversations.find((conversation) => conversation.peer_id === peerId)?.peer_display_name || "Unknown device";
  const shortDeviceId = (peerId: string) => peerId.slice(0, 8).toUpperCase();

  const chatItems = [
    ...messages.map((message) => ({ kind: "message" as const, timestamp: message.timestamp, message })),
    ...fileMessages.map((file) => ({ kind: "file" as const, timestamp: file.timestamp, file })),
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  const refreshNow = async () => { setRefreshing(true); await Promise.all([refreshPeers(), refreshConversations(), refreshTrusted()]); setRefreshing(false); };
  const copyDeviceId = async () => { await navigator.clipboard.writeText(identity?.device_id || ""); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  if (loading || !identity) return <main className="shell"><h1>LocalMesh</h1><p>{error || "Loading device…"}</p></main>;
  return <main className="shell">
    <header className="header"><div className="brand-lockup"><div className="brand-mark"><span /><span /><span /><span /></div><div><span className="eyebrow">LOCAL NETWORK // SECURE CHANNEL</span><h1>LocalMesh</h1><p>Offline LAN Communication</p></div></div><div className="identity"><div className="identity-status"><span className="online-dot" />SYSTEM ONLINE</div><strong>{identity.device_name}</strong><span>{network?.addresses.join(", ") || "No LAN address"}</span><details className="network-details"><summary>Network details</summary><div><span>Discovery UDP</span><b>{network?.discovery_port ?? "—"}</b></div><div><span>Transport TCP</span><b>{network?.transport_port ?? "—"}</b></div></details></div></header>
    {error && <div className="error">{error}</div>}
    <div className="toolbar"><div><strong>{peers.length}</strong><span> nearby {peers.length === 1 ? "device" : "devices"}</span><span className="toolbar-separator">·</span><strong>{conversations.length}</strong><span> conversations</span></div><div className="toolbar-actions"><button className="copy-button" onClick={copyDeviceId} title="Copy this computer's unique LocalMesh ID">{copied ? "Copied" : "Copy device ID"}</button><button className="icon-button" onClick={refreshNow} disabled={refreshing} title="Scan the LAN and reload conversations">{refreshing ? "Scanning…" : "Rescan devices"}</button></div></div>
    <div className="layout">
      <aside className="sidebar">
        <section><h2>Nearby devices</h2>{peers.length === 0 && <p className="muted">No peers discovered yet.</p>}{peers.map((peer) => { const isTrusted = trusted.some((item) => item.device_id === peer.device_id); return <div className="peer" key={peer.device_id}><div><strong>{peer.display_name}</strong><small><span className="online-dot" />Online · {peer.device_name} · {peer.address}</small></div><div className="actions"><button onClick={() => openConversation(peer.device_id)}>Chat</button>{isTrusted ? <button className="secondary" onClick={() => revokePeer(peer.device_id)}>Revoke</button> : <button onClick={() => trustPeer(peer.device_id)}>Trust</button>}</div></div>; })}</section>
        <section><h2>Conversations</h2>{conversations.length === 0 && <p className="muted">No conversations yet.</p>}{conversations.map((conversation) => <div className="conversation-row" key={conversation.conversation_id}><button className={`conversation ${selected?.conversation_id === conversation.conversation_id ? "selected" : ""}`} onClick={() => setSelected(conversation)}><span className="conversation-name">{peerLabel(conversation.peer_id)}</span><small>{peers.some((peer) => peer.device_id === conversation.peer_id) ? "Online" : "Offline"} · Device {shortDeviceId(conversation.peer_id)}</small></button><button className="conversation-delete" type="button" title="Delete conversation" aria-label={`Delete conversation with ${peerLabel(conversation.peer_id)}`} onClick={() => deleteConversation(conversation)}><Icon name="trash" /></button></div>)}</section>
      </aside>
      <section className="chat"><div className="chat-header"><div><h2>{selected ? `Conversation with ${peerLabel(selected.peer_id)}` : "Select a device to start"}</h2>{selected && <small>{peers.some((peer) => peer.device_id === selected.peer_id) ? "Online" : "Offline"}</small>}</div>{selected && <button className="clear-chat" type="button" onClick={clearChat} disabled={!messages.length && !fileMessages.length} title="Clear chat"><Icon name="broom" />Clear chat</button>}</div>{selected ? <><div className="messages">{chatItems.length === 0 && <p className="muted">No messages yet.</p>}{chatItems.map((item) => item.kind === "message" ? <article className={item.message.sender_id === identity.device_id ? "mine" : "theirs"} key={item.message.message_id}><span>{item.message.content}</span><div className="message-meta"><small>{new Date(item.message.timestamp).toLocaleTimeString()} · {item.message.status}</small><button className="delete-message" type="button" title="Delete message" aria-label="Delete message" onClick={() => removeMessage(item.message.message_id)}><Icon name="trash" /></button></div></article> : <div className={`chat-file-event ${item.file.sender_id === identity.device_id ? "mine" : "theirs"}`} key={item.file.transfer_id}><Icon name="paperclip" /><span>{item.file.file_name}</span><button className="open-file" onClick={() => openFile(item.file.transfer_id)}>Open</button><button className="delete-message" type="button" title="Delete file" aria-label="Delete file" onClick={() => removeFile(item.file.transfer_id)}><Icon name="trash" /></button></div>)}{fileProgress && fileProgress.status !== "complete" && fileProgress.conversation_id === selected.conversation_id && <div className={`chat-file-event ${fileProgress.sender_id === identity.device_id ? "mine" : "theirs"}`}><Icon name="paperclip" /><span>{fileProgress.status === "sending" ? "Sending" : "Receiving"}: {fileProgress.file_name || "file"}</span><progress value={fileProgress.transferred} max={fileProgress.total || 1} /></div>}</div><form className="composer" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" maxLength={10000} disabled={sending || fileSending} /><button type="button" className="secondary" onClick={sendFile} disabled={sending || fileSending} title="Send file"><Icon name="paperclip" />{fileSending ? "Sending file…" : "Send file"}</button>{fileSending && <button type="button" className="cancel" onClick={cancelFile}>Cancel</button>}<button type="submit" disabled={sending || fileSending || !draft.trim()} title="Send message"><Icon name="send" />{sending ? "Sending…" : "Send"}</button></form></> : <div className="empty">Choose a discovered peer from the left.</div>}</section>
    </div>
  </main>;
}

export default App;
