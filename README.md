# LocalMesh

LocalMesh is a desktop application for private communication over a local Wi-Fi, Ethernet, or compatible mobile-hotspot network. It uses Electron, TypeScript, React, Bun, SQLite, UDP discovery, and encrypted TCP transport. It does not require a cloud server or user account.

## Current status

The Windows desktop application, chat UI, peer discovery, encrypted messaging, file transfer, installer, automated tests, CI, and Windows release pipeline are implemented. Real two-computer LAN testing is still required before production release. Android and iOS clients are not included.

## User installation

Download the latest Windows installer from:

https://github.com/LocalMeshTeam/LocalMesh/releases

Install `LocalMesh Setup <version>.exe`, open LocalMesh on two computers, and connect both computers to the same local network. Trust the discovered peer, select Chat, then send messages or files.

## Developer setup

```powershell
git clone https://github.com/LocalMeshTeam/LocalMesh.git
cd LocalMesh
bun install
bun run dev
```

Use `bun run dev`, not the Vite URL directly, because Electron provides the IPC bridge.

```powershell
bun run test          # unit tests plus Electron SQLite tests
bun run test:unit     # portable tests for CI
bun run build         # renderer and Electron production build
bun run package:win   # Windows NSIS installer in release/
```

## File map

### Application entry points

- `index.html` - HTML shell loaded by Vite.
- `src/main.tsx` - mounts the React application.
- `src/App.tsx` - peers, conversations, messages, trust controls, file transfer, and status feedback.
- `src/App.css` - renderer layout, responsive styling, chat, and transfer styles.
- `electron/main.ts` - Electron main process, database startup, discovery, transport, IPC, messages, and files.
- `electron/preload.cts` - safe context-isolated bridge exposed to React.
- `src/electron.d.ts` - TypeScript declarations for the preload API.

### Persistence and security

- `electron/database.ts` - SQLite migrations, identity, conversations, messages, and statuses.
- `electron/security.ts` - Ed25519 signing, X25519 key exchange, AES-GCM encryption, and fingerprints.
- `electron/trust.ts` - persistent trusted-peer records and revoke checks.
- `electron/storage.ts` - safe file storage, chunk writes, size limits, and SHA-256 verification.

### LAN networking

- `electron/discovery.ts` - UDP multicast announcements and online peer tracking on `239.255.42.99:45454`.
- `electron/protocol.ts` - versioned JSON packets and validation.
- `electron/transport.ts` - authenticated TCP transport on port `45455`, messages, files, acknowledgements, retries, and timeouts.
- `electron/file-transfer.ts` - signed file offers, encrypted chunks, and completion verification.

### Tests

- `electron/database.test.ts` - SQLite behavior and validation.
- `electron/discovery.test.ts` - discovery packet validation.
- `electron/protocol.test.ts` - packet encoding and decoding.
- `electron/security.test.ts` - key persistence, signing, and encryption.
- `electron/storage.test.ts` - chunks, safe paths, and checksums.
- `electron/transport.test.ts` - encrypted loopback transport.
- `electron/file-transfer.test.ts` - signed and encrypted file transfer.
- `electron/trust.test.ts` - trust persistence and key changes.

### Configuration and documentation

- `package.json` - dependencies, scripts, metadata, and Electron Builder configuration.
- `bun.lock` - exact Bun dependency lockfile.
- `vite.config.ts` - Vite configuration.
- `tsconfig.json` and `tsconfig.electron.json` - renderer and Electron TypeScript configuration.
- `.gitignore` - generated builds, installers, databases, and local artifacts.
- `.github/workflows/ci.yml` - build and portable tests for pushes and pull requests.
- `.github/workflows/release.yml` - Windows installer and GitHub Release for `v*` tags.
- `docs/ARCHITECTURE.md` - detailed runtime flow.
- `docs/ROADMAP.md` - project phases.
- `docs/TESTING.md` - automated and two-computer LAN testing.
- `docs/README.md` - learning guide.

## CI/CD pipeline

CI runs on pushes and pull requests. It installs dependencies, builds the application, and runs portable backend tests.

CD runs when a version tag is pushed:

```powershell
git tag v0.1.2
git push origin v0.1.2
```

The release job builds `LocalMesh Setup <version>.exe`, uploads the artifact, and attaches it to a GitHub Release. Installers are generated outputs and are not committed to Git.

## Data and networking

Conversations, messages, trusted keys, and received files are stored locally. Discovered peers and their current IP addresses are temporary and rediscovered whenever the app runs.

Both computers must be on the same LAN and allow UDP `45454` and TCP `45455` through Windows Firewall. Mobile hotspots may block multicast or device-to-device traffic.

## Remaining work

- Complete two-computer LAN validation.
- Add file-transfer history records to SQLite.
- Add a custom application icon.
- Improve production logging and error recovery.
- Add macOS/Linux packaging, code signing, and auto-updates later.
- Build Android/iOS clients as a separate project later.
