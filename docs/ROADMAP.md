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

Status: implementation complete; real two-device testing remains.

File:

- `electron/discovery.ts`

Completed:

- UDP multicast discovery.
- Device announcements every five seconds.
- Self-device filtering.
- Peer tracking by device ID.
- Stale peer removal after fifteen seconds.
- Clean shutdown when Electron exits.

The discovery packet includes the TCP transport port used by the next phase.

## Current phase

### Phase 4 — LAN message transport

Status: implementation complete; two-device testing remains.

An automated loopback integration test now verifies encrypted delivery and acknowledgements between two transport instances.

The goal is to send messages between discovered peers. The frontend will not be changed in this phase.

Files added:

- `electron/protocol.ts` — packet formats, serialization, validation, and protocol versions.
- `electron/transport.ts` — TCP connections, sending, receiving, retries, and timeouts.

Files to update:

- `electron/main.ts` — start and stop the transport service and connect it to IPC/database logic.
- `electron/database.ts` — update message delivery status and prevent duplicate received messages.
- `electron/discovery.ts` — include or provide the peer connection address and transport port.

Implemented:

- Start a TCP listener.
- Connect to discovered peers.
- Exchange a hello packet.
- Send message packets.
- Receive and persist message packets.
- Send delivery acknowledgements.
- Update local message status.
- Create or reuse the matching conversation on the receiving device.
- Ignore duplicate received message IDs.
- Wait for acknowledgements with a five-second timeout.
- Retry delivery up to three attempts.

Remaining:

- Test with two computers on the same LAN.

## Remaining phases

### Phase 5 — Security

Status: complete for the backend foundation; authorization controls are exposed for the future frontend.

Files:

- `electron/security.ts`
- `electron/protocol.ts`
- `electron/transport.ts`
- `electron/main.ts`
- `electron/trust.ts`

Implemented:

- Persistent Ed25519 signing key.
- Persistent X25519 key-exchange key.
- Public-key fingerprint generation.
- Signing, verification, and shared-secret derivation helpers.
- Signed public-key exchange during the transport hello handshake.
- Rejection of unauthenticated hello packets.
- X25519 shared-key derivation for peer sessions.
- AES-256-GCM message payload encryption.
- Ed25519 signatures for encrypted message packets.
- Session key pinning for discovered device IDs.
- Timestamp-based replay protection.
- Persistent trusted-peer records with fingerprints.
- Trust and revoke IPC handlers.

Remaining work:

- Frontend controls for reviewing and approving discovered peers.

### Phase 6 — Frontend application

Status: initial peer and chat interface implemented; refinement remains.

Frontend work begins here.

Files:

- `src/App.tsx` — peer list, conversations, chat, and message status.
- `src/electron.d.ts` — typed IPC API.
- `src/App.css` — application styling.
- `electron/preload.cts` — expose finalized backend APIs.

Work:

- Add revoke confirmation and responsive layout.
- Improve advanced loading, error, and delivery-state UX.

Completed:

- Display discovered peers, device names, IP addresses, and online state.
- Create and select conversations.
- Display message history.
- Send messages through IPC.
- Show pending, delivered, and failed statuses.
- Trust and revoke discovered peers.
- Poll peers, conversations, and messages for updates.

### Phase 7 — File transfer

Status: storage and encrypted packet routing implemented; file-selection IPC and end-to-end transfer remain.

Files to add:

- `electron/file-transfer.ts`
- `electron/storage.ts`

Work:

- Add transfer protocol and IPC file selection APIs.
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

Status: database, protocol, security, trust, and loopback transport coverage added; LAN validation remains.

Files to add:

- `electron/database.test.ts`
- `electron/discovery.test.ts`
- `electron/transport.test.ts`
- `electron/security.test.ts`

Automated tests now cover database behavior, key persistence, signatures, encryption/decryption, packet round trips, trust records, transport delivery, and malformed packet rejection.

Work:

- Two-device message delivery tests.
- Two-device discovery tests.
- Failure and retry tests.
- Performance benchmarks.

### Phase 10 — Electron packaging

Status: Windows installer configuration added; installer validation remains.

Files to update:

- `package.json`
- `.github/workflows/release.yml`

Completed:

- Added Electron Builder configuration for a Windows NSIS installer.
- Configured native `better-sqlite3` unpacking.

Work:

- Build Windows installers.
- Build macOS packages.
- Build Linux packages.
- Add application icons and metadata.

### Phase 11 — CD and releases

Status: Windows release workflow added; tag-release validation remains.

File:

- `.github/workflows/release.yml`

Work:

1. Test the release workflow with a version tag.
2. Add macOS and Linux release jobs later.
3. Add code signing and auto-updates later.

## Supporting files

- `.github/workflows/ci.yml` — installs Bun and validates the build on pushes and pull requests.
- `docs/ARCHITECTURE.md` — explains the current file relationships and runtime flow.
- `README.md` — project overview and setup instructions.
- `dist/` — generated React build output; do not edit or commit.
- `dist-electron/` — generated Electron JavaScript output; do not edit or commit.

## Development rule

Each phase should be implemented, tested, documented, and committed before starting the next phase. The frontend remains unchanged during backend networking and security work.
