# LocalMesh

LocalMesh is a local-first, offline LAN communication platform. Its long-term goal is to support device discovery, peer-to-peer chat, file transfer, large-file transfer, screen sharing, and secure communication without depending on the Internet.

The project is currently in the foundation stage. Tauri IPC, local device identity, SQLite initialization, and the first conversation/message schema are implemented. LAN networking, peer discovery, chat UI, file transfer, screen sharing, and security are not implemented yet.

## Technology

- React and TypeScript for the user interface
- Vite for frontend development and builds
- Tauri 2 for the desktop window and frontend-to-native bridge
- Rust for native application logic
- SQLite through `rusqlite` for local persistence
- pnpm for JavaScript package management

## Prerequisites

On Windows, install Node.js, pnpm, Rust with the stable MSVC toolchain, Visual Studio C++ build tools, and WebView2.

Check the tools with:

```powershell
node --version
pnpm --version
rustc --version
cargo --version
```

## Clone and install

```powershell
git clone https://github.com/DikshJaswal/LocalMesh.git
cd LocalMesh
pnpm install
```

Rust dependencies are restored automatically by Cargo when the Tauri commands are run.

## Run the desktop application

```powershell
pnpm tauri dev
```

This starts Vite and opens a separate Tauri desktop window. Do not open `http://localhost:1420` directly in a normal browser when testing IPC; a normal browser does not have Tauri's native bridge.

## Other commands

```powershell
pnpm dev
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```

## Project structure

```text
LocalMesh/
├── src/                         React + TypeScript frontend
├── src-tauri/                   Tauri and Rust backend
├── docs/                        Contributor and learning documentation
├── public/                      Static frontend assets
├── package.json                 Frontend scripts and dependencies
├── pnpm-lock.yaml               Exact frontend dependency versions
├── vite.config.ts               Vite configuration
└── README.md                    This document
```

See [`src-tauri/README.md`](src-tauri/README.md), [`src-tauri/src/database/README.md`](src-tauri/src/database/README.md), and [`docs/README.md`](docs/README.md).

## Current implementation status

### Completed

- Tauri 2 + React + TypeScript project setup
- Rust backend compilation
- React-to-Rust IPC using `invoke`
- `get_app_info` and `get_device_identity` commands
- UUID-based local device identity
- Identity persistence in SQLite
- Shared Tauri-managed database connection
- SQLite migrations versions 1 and 2
- Device identity, conversations, and messages tables
- Initial repositories and Rust tests

### Not completed yet

- IPC commands for conversations and messages
- Conversation and chat UI
- LAN sockets and transport protocol
- Peer discovery
- Peer authentication and encryption
- File transfer
- Screen sharing
- Mobile application
- Performance benchmarks

## Development approach

LocalMesh is built incrementally. Each subsystem is explained, implemented, tested, and committed before the next subsystem is started. Communication must work on a LAN even when Internet access is disabled; no cloud database or cloud transport is planned for LAN communication.
