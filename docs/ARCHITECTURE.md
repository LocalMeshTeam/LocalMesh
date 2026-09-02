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
- `electron/discovery.ts` announces the local device over UDP multicast and tracks nearby LocalMesh peers in memory.
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
5. The app can call the typed preload API for identity, conversations, and messages.
6. The preload bridge sends the request through Electron IPC.
7. `electron/main.ts` validates the request boundary and calls the database service.
8. `electron/database.ts` reads or writes SQLite.
9. The result returns through IPC; the future frontend will render it.

In parallel, `electron/discovery.ts` sends a discovery announcement every five seconds on multicast address `239.255.42.99`, port `45454`. It records remote peers and removes peers that have not announced for fifteen seconds.

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
