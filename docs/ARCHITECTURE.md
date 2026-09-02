# LocalMesh Architecture

This document explains how the LocalMesh files connect and how a request moves through the application.

See [`ROADMAP.md`](ROADMAP.md) for completed phases and upcoming work.

## File map

```text
index.html
└── src/main.tsx
    └── src/App.tsx
        └── window.localmesh
            └── electron/preload.cts
                └── Electron IPC
                    └── electron/main.ts
                        └── electron/database.ts
                            └── better-sqlite3
                                └── localmesh.db
electron/main.ts
└── electron/discovery.ts
    └── UDP multicast LAN discovery
```

## Responsibilities

- `index.html` loads the React entry point.
- `src/main.tsx` mounts the React application.
- `src/App.tsx` renders the UI and requests device identity.
- `src/electron.d.ts` types the `window.localmesh` API.
- `electron/preload.cts` exposes the safe, context-isolated IPC API.
- `electron/main.ts` starts Electron, creates the window, and registers IPC handlers.
- `electron/database.ts` owns SQLite, migrations, and device identity persistence.
- `electron/discovery.ts` announces the local device over UDP multicast, tracks nearby LocalMesh peers in memory, and reports network constants.
- `electron/trust.ts` persists trusted peer public keys and exposes fingerprint-based authorization state.
- `electron/security.ts` stores persistent signing/key-exchange keys and provides cryptographic identity helpers.
- `vite.config.ts` serves and builds the renderer on port `1420`.
- `tsconfig.electron.json` compiles the Electron main process and preload script.
- `.github/workflows/ci.yml` checks dependencies and builds the project on GitHub.

The renderer cannot access Node.js or SQLite directly. It only uses the small API exposed by the preload bridge.

Device identity uses the operating-system hostname and username when first created. The generated UUID is stored in SQLite and remains stable across restarts. IP addresses are discovered dynamically from network interfaces and peer packets; they are not used as permanent identity because they can change.

## Runtime flow

1. Vite serves the renderer on port `1420`.
2. Electron starts and creates a `BrowserWindow`.
3. Electron loads the CommonJS preload output, `dist-electron/preload.cjs`.
4. React loads `src/App.tsx`.
5. The app can call the typed preload API for identity, discovered peers, conversations, messages, and trust operations.
6. The preload bridge sends the request through Electron IPC.
7. `electron/main.ts` validates the request boundary and calls the database service.
8. `electron/database.ts` reads or writes SQLite.
9. The result returns through IPC; the future frontend will render it.

In parallel, `electron/discovery.ts` sends a discovery announcement every five seconds on multicast address `239.255.42.99`, port `45454`. It records remote peers and removes peers that have not announced for fifteen seconds.

Message transport uses TCP port `45455`. Each message is newline-framed JSON and requires an acknowledgement within five seconds. Failed attempts are retried up to three times; the receiver's message ID deduplication makes retries safe.

Each installation creates persistent Ed25519 signing and X25519 key-exchange keys under Electron's user-data directory. Transport hello packets advertise and sign the public keys, and invalid signatures are rejected. Message payloads use an X25519-derived AES-256-GCM key and Ed25519 signatures. The transport pins a device's signing key for the current session, rejects messages outside a one-minute clock window, and SQLite deduplicates message IDs. `electron/trust.ts` persists approved peer keys; the future frontend will provide the approval and revoke controls.

## Commands

```powershell
bun run dev
```

Starts Vite and Electron together. The Electron process also rebuilds `better-sqlite3` for the installed Electron version.

```powershell
bun run build
```

Type-checks and builds the renderer into `dist/`, then compiles Electron files into `dist-electron/`.

```powershell
bun run rebuild:native
```

Rebuilds native dependencies for Electron when the Node ABI changes.

## CI and CD

`.github/workflows/ci.yml` is CI. It installs Bun, runs `bun ci`, and runs `bun run build` for pushes and pull requests.

This document is repository documentation. It is not copied into the application bundle.

CD is not implemented yet. A future CD workflow should use Electron Forge or electron-builder to create platform installers and publish them from version tags or GitHub releases.
