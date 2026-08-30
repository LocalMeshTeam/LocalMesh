import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type DeviceIdentity = {
  device_id: string;
  device_name: string;
  display_name: string;
  created_at: string;
};

function App() {
  const [identity, setIdentity] = useState<DeviceIdentity | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setError(
        "Tauri runtime is unavailable. Start LocalMesh with `pnpm tauri dev` instead of opening the Vite URL directly.",
      );
      return;
    }

    invoke<DeviceIdentity>("get_device_identity")
      .then(setIdentity)
      .catch((error) => {
        console.error("Identity error:", error);
        setError(`Failed to load device identity: ${String(error)}`);
      });
  }, []);

  return (
    <main className="container">
      <h1>LocalMesh</h1>
      <p>Offline LAN Communication Platform</p>

      {error && <p>{error}</p>}

      {identity && (
        <section>
          <h2>Device Identity</h2>
          <p>Device ID: {identity.device_id}</p>
          <p>Device Name: {identity.device_name}</p>
          <p>Display Name: {identity.display_name}</p>
          <p>Created At: {identity.created_at}</p>
        </section>
      )}
    </main>
  );
}

export default App;
