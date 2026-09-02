import { useCallback, useEffect, useState } from "react";
import "./App.css";

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
  const [fileStatus, setFileStatus] = useState("");
  const [fileProgress, setFileProgress] = useState<{ transfer_id: string; file_name?: string; transferred: number; total: number; status: string } | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<{ transfer_id: string; file_name: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const mergeMessages = (incoming: Message[]) => setMessages((current) => Array.from(new Map([...current, ...incoming].map((message) => [message.message_id, message])).values()).sort((left, right) => left.timestamp.localeCompare(right.timestamp)));

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
    const removeReceived = window.localmesh.onFileReceived((file) => setReceivedFiles((current) => [file, ...current.filter((item) => item.transfer_id !== file.transfer_id)]));
    return () => { removeProgress(); removeReceived(); };
  }, []);

  useEffect(() => {
    if (selected) window.localmesh.listMessages(selected.conversation_id).then(mergeMessages).catch((reason) => setError(String(reason)));
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setInterval(() => {
      window.localmesh.listMessages(selected.conversation_id).then(mergeMessages).catch((reason) => setError(String(reason)));
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [selected]);

  const openConversation = async (peerId: string) => {
    try { const conversation = await window.localmesh.createConversation(peerId); setConversations(await window.localmesh.listConversations()); setSelected(conversation); }
    catch (reason) { setError(String(reason)); }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    try { const message = await window.localmesh.createMessage(selected.conversation_id, draft); mergeMessages([message]); setDraft(""); setError(""); }
    catch (reason) { setError(String(reason)); }
    finally { setSending(false); }
  };

  const trustPeer = async (deviceId: string) => {
    try { await window.localmesh.trustPeer(deviceId); await refreshTrusted(); }
    catch (reason) { setError(String(reason)); }
  };

  const sendFile = async () => {
    if (!selected) return;
    setFileSending(true); setFileStatus("Choosing file…"); setError("");
    try {
      const file = await window.localmesh.chooseAndSendFile(selected.conversation_id);
      setFileStatus(file ? "File sent" : "File selection cancelled");
    } catch (reason) { setError(String(reason)); setFileStatus(""); }
    finally { setFileSending(false); }
  };

  const cancelFile = async () => {
    if (!fileProgress) return;
    await window.localmesh.cancelFileTransfer(fileProgress.transfer_id);
    setFileStatus("File transfer cancelled"); setFileSending(false);
  };

  const revokePeer = async (deviceId: string) => {
    const peer = peers.find((candidate) => candidate.device_id === deviceId);
    if (!window.confirm(`Revoke trust for ${peer?.display_name || deviceId}?`)) return;
    try { await window.localmesh.revokePeer(deviceId); await refreshTrusted(); }
    catch (reason) { setError(String(reason)); }
  };

  const peerLabel = (peerId: string) => peers.find((peer) => peer.device_id === peerId)?.display_name || peerId;

  const refreshNow = async () => { setRefreshing(true); await Promise.all([refreshPeers(), refreshConversations(), refreshTrusted()]); setRefreshing(false); };
  const copyDeviceId = async () => { await navigator.clipboard.writeText(identity?.device_id || ""); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  if (loading || !identity) return <main className="shell"><h1>LocalMesh</h1><p>{error || "Loading device…"}</p></main>;
  return <main className="shell">
    <header className="header"><div><h1>LocalMesh</h1><p>Offline LAN Communication</p></div><div className="identity"><strong>{identity.device_name}</strong><span>{network?.addresses.join(", ") || "No LAN address"}</span><small>Discovery {network?.discovery_port ?? "—"} · Transport {network?.transport_port ?? "—"}</small></div></header>
    {error && <div className="error">{error}</div>}
    <div className="toolbar"><div><strong>{peers.length}</strong><span> nearby {peers.length === 1 ? "device" : "devices"}</span><span className="toolbar-separator">·</span><strong>{conversations.length}</strong><span> conversations</span></div><div className="toolbar-actions"><button className="copy-button" onClick={copyDeviceId}>{copied ? "Copied" : "Copy device ID"}</button><button className="icon-button" onClick={refreshNow} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button></div></div>
    <div className="layout">
      <aside className="sidebar">
        <section><h2>Nearby devices</h2>{peers.length === 0 && <p className="muted">No peers discovered yet.</p>}{peers.map((peer) => { const isTrusted = trusted.some((item) => item.device_id === peer.device_id); return <div className="peer" key={peer.device_id}><div><strong>{peer.display_name}</strong><small><span className="online-dot" />Online · {peer.device_name} · {peer.address}</small></div><div className="actions"><button onClick={() => openConversation(peer.device_id)}>Chat</button>{isTrusted ? <button className="secondary" onClick={() => revokePeer(peer.device_id)}>Revoke</button> : <button onClick={() => trustPeer(peer.device_id)}>Trust</button>}</div></div>; })}</section>
        <section><h2>Conversations</h2>{conversations.length === 0 && <p className="muted">No conversations yet.</p>}{conversations.map((conversation) => <button className={`conversation ${selected?.conversation_id === conversation.conversation_id ? "selected" : ""}`} key={conversation.conversation_id} onClick={() => setSelected(conversation)}>{peerLabel(conversation.peer_id)}{peers.some((peer) => peer.device_id === conversation.peer_id) ? <small>Online</small> : <small>Offline</small>}</button>)}</section>
      </aside>
      <section className="chat"><div className="chat-header"><h2>{selected ? `Conversation with ${peerLabel(selected.peer_id)}` : "Select a device to start"}</h2>{selected && <small>{peers.some((peer) => peer.device_id === selected.peer_id) ? "Online" : "Offline"}</small>}</div>{selected ? <><div className="messages">{messages.length === 0 && <p className="muted">No messages yet.</p>}{messages.map((message) => <article className={message.sender_id === identity.device_id ? "mine" : "theirs"} key={message.message_id}><span>{message.content}</span><small>{new Date(message.timestamp).toLocaleTimeString()} · {message.status}</small></article>)}</div><form className="composer" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" maxLength={10000} disabled={sending || fileSending} /><button type="button" className="secondary" onClick={sendFile} disabled={sending || fileSending}>{fileSending ? "Sending file…" : "Send file"}</button>{fileSending && <button type="button" className="cancel" onClick={cancelFile}>Cancel</button>}<button type="submit" disabled={sending || fileSending || !draft.trim()}>{sending ? "Sending…" : "Send"}</button></form>{fileStatus && <div className="file-status">{fileStatus}</div>}{fileProgress && <div className="file-progress"><span>{fileProgress.status === "complete" ? `Completed: ${fileProgress.file_name || "file"}` : `${fileProgress.status === "sending" ? "Sending" : "Receiving"}: ${fileProgress.file_name || "file"}`}</span><progress value={fileProgress.transferred} max={fileProgress.total || 1} /></div>}{receivedFiles.length > 0 && <div className="received-files"><strong>Received files</strong>{receivedFiles.map((file) => <span key={file.transfer_id}>{file.file_name}<button className="open-file" onClick={() => window.localmesh.openReceivedFile(file.transfer_id)}>Open</button></span>)}</div>}</> : <div className="empty">Choose a discovered peer from the left.</div>}</section>
    </div>
  </main>;
}

export default App;
