import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Checking native engine...");

  useEffect(() => {
    invoke<string>("get_app_info")
      .then((message) => setStatus(message))
      .catch(() => setStatus("Native engine connection failed."));
  }, []);

  return (
    <main className="container">
      <h1>LocalMesh</h1>
      <p>Offline LAN Communication Platform</p>

      <div>
        <strong>Native Engine:</strong> {status}
      </div>
    </main>
  );
}

export default App;