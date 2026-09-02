# LocalMesh Learning Guide

LocalMesh is a Windows desktop application built with React, TypeScript, Electron, Bun, SQLite, and Node networking APIs.

## What to learn

- React and TypeScript: components, state, effects, promises, forms, and typed APIs in `src/App.tsx`.
- Vite and Bun: renderer development/builds and dependency management in `vite.config.ts` and `package.json`.
- Electron: main process, `BrowserWindow`, preload, context isolation, and IPC in `electron/main.ts` and `electron/preload.cts`.
- SQLite: migrations, tables, foreign keys, and parameterized queries in `electron/database.ts`.
- Networking: UDP multicast discovery, TCP sockets, framing, retries, and acknowledgements in `electron/discovery.ts` and `electron/transport.ts`.
- Security: Ed25519 signatures, X25519 key exchange, AES-GCM encryption, fingerprints, and trust records in `electron/security.ts` and `electron/trust.ts`.
- File transfer: chunking, checksums, safe storage, progress, cancellation, and acknowledgements in `electron/file-transfer.ts` and `electron/storage.ts`.

## Runtime flow

```text
React UI
  -> typed window.localmesh API
  -> context-isolated preload
  -> Electron IPC handlers
  -> database, discovery, transport, security, or file storage
  -> result/event back to React
```

## Commands

```powershell
bun install
bun run dev
bun run test
bun run build
bun run package:win
```

`bun run test` runs portable tests with Bun and SQLite tests with Electron's Node runtime because `better-sqlite3` is an Electron native module.

## Current status

The initial desktop chat and file-transfer experience is implemented. The main remaining validation is testing two real computers on the same LAN. Mobile clients, macOS/Linux installers, code signing, and advanced transfer history are future work.

See [`ARCHITECTURE.md`](ARCHITECTURE.md), [`ROADMAP.md`](ROADMAP.md), and [`TESTING.md`](TESTING.md) for detailed information.
