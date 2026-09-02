# LocalMesh Project Roadmap

This document tracks what LocalMesh has completed and what remains. The project is being built backend-first. The frontend chat experience will be implemented only after the backend and LAN transport are stable.

## Completed

### Phase 1 — Electron foundation

Status: complete.

Files:

- `electron/main.ts` — starts Electron and creates the desktop window.
- `electron/preload.cts` — exposes the secure renderer-to-main IPC bridge.
- `package.json` — Bun, Electron, Vite, and development scripts.
- `vite.config.ts` — renderer development server and build configuration.
- `tsconfig.json` — renderer TypeScript configuration.
- `tsconfig.electron.json` — Electron TypeScript configuration.

Completed:

- Migrated from Tauri/Rust to Electron/TypeScript.
- Added Bun package management.
- Enabled context isolation and disabled renderer Node.js access.
- Added native-module rebuilding for Electron.

### Phase 2 — Local database and backend APIs

Status: backend complete; frontend integration intentionally postponed.

File:

- `electron/database.ts`

Completed:

- SQLite database creation.
- Database migrations.
- Device identity persistence.
- Conversation and message tables.
- Conversation creation and listing.
- Message creation and listing.
- Input validation and message length limits.
- Duplicate conversation prevention.

The device name and display name are loaded dynamically from the operating system. The device ID is a persistent generated UUID; it is not based on the IP address because IP addresses can change.

IPC handlers are registered in `electron/main.ts` and exposed by `electron/preload.cts`.

### Phase 3 — LAN peer discovery

Status: basic implementation complete; real two-device testing remains.

File:

- `electron/discovery.ts`

Completed:

- UDP multicast discovery.
- Device announcements every five seconds.
- Self-device filtering.
- Peer tracking by device ID.
- Stale peer removal after fifteen seconds.
- Clean shutdown when Electron exits.

## Current phase

### Phase 4 — LAN message transport

Status: next phase.

The goal is to send messages between discovered peers. The frontend will not be changed in this phase.

Files to add:

- `electron/protocol.ts` — packet formats, serialization, validation, and protocol versions.
- `electron/transport.ts` — TCP connections, sending, receiving, retries, and timeouts.

Files to update:

- `electron/main.ts` — start and stop the transport service and connect it to IPC/database logic.
- `electron/database.ts` — update message delivery status and prevent duplicate received messages.
- `electron/discovery.ts` — include or provide the peer connection address and transport port.

Required behavior:

- Start a TCP listener.
- Connect to discovered peers.
- Exchange a hello packet.
- Send message packets.
- Receive and persist message packets.
- Send delivery acknowledgements.
- Handle disconnects and timeouts.
- Retry failed messages safely.

## Remaining phases

### Phase 5 — Security

Files:

- `electron/security.ts`
- `electron/protocol.ts`
- `electron/transport.ts`
- `electron/main.ts`

Work:

- Peer authentication.
- Public/private key identity.
- Key exchange.
- Encrypted packets.
- Replay and tampering protection.

### Phase 6 — Frontend application

Frontend work begins here.

Files:

- `src/App.tsx` — peer list, conversations, chat, and message status.
- `src/electron.d.ts` — typed IPC API.
- `src/App.css` — application styling.
- `electron/preload.cts` — expose finalized backend APIs.

Work:

- Display discovered peers.
- Create and select conversations.
- Display message history.
- Send messages through IPC.
- Show online/offline state.
- Show pending, delivered, and failed statuses.

### Phase 7 — File transfer

Files to add:

- `electron/file-transfer.ts`
- `electron/storage.ts`

Work:

- File selection and metadata.
- Chunked transfer.
- Progress reporting.
- Checksums.
- Retry and resume support.
- Safe local storage.

### Phase 8 — Screen sharing

Work:

- Screen capture permissions.
- Consent controls.
- Streaming transport.
- Start/stop controls.
- Performance and privacy protections.

### Phase 9 — Testing and performance

Files to add:

- `electron/database.test.ts`
- `electron/discovery.test.ts`
- `electron/transport.test.ts`
- `electron/security.test.ts`

Work:

- Database tests.
- Protocol tests.
- Two-device discovery tests.
- Message delivery tests.
- Failure and retry tests.
- Security tests.
- Performance benchmarks.

### Phase 10 — Electron packaging

Files to update:

- `package.json`
- `.github/workflows/release.yml`

Work:

- Add Electron Forge or electron-builder.
- Build Windows installers.
- Build macOS packages.
- Build Linux packages.
- Add application icons and metadata.

### Phase 11 — CD and releases

File:

- `.github/workflows/release.yml`

Work:

1. Build the application on version tags.
2. Package platform installers.
3. Upload release artifacts.
4. Create a GitHub Release.
5. Add code signing and auto-updates later.

## Supporting files

- `.github/workflows/ci.yml` — installs Bun and validates the build on pushes and pull requests.
- `docs/ARCHITECTURE.md` — explains the current file relationships and runtime flow.
- `README.md` — project overview and setup instructions.
- `dist/` — generated React build output; do not edit or commit.
- `dist-electron/` — generated Electron JavaScript output; do not edit or commit.

## Development rule

Each phase should be implemented, tested, documented, and committed before starting the next phase. The frontend remains unchanged during backend networking and security work.
