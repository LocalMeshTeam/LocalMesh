# LocalMesh

LocalMesh is a local-first, offline LAN communication platform. Its long-term goal is to support device discovery, peer-to-peer chat, file transfer, large-file transfer, screen sharing, and secure communication without depending on the Internet.

The project is currently in the backend foundation stage. Electron IPC, local device identity, SQLite initialization, conversation/message APIs, and basic LAN peer discovery are implemented. Message transport, chat UI, file transfer, screen sharing, and security are not implemented yet.

## Technology

- React and TypeScript for the user interface
- Vite for frontend development and builds
- Electron for the desktop window and frontend-to-main-process bridge
- TypeScript for desktop application logic
- SQLite through `better-sqlite3` for local persistence
- Bun for JavaScript package management and scripts

## Prerequisites

On Windows, install Bun. Electron bundles its Chromium runtime, so Rust and WebView2 are not required for this application.

Check the tools with:

```powershell
bun --version
```

## Clone and install

```powershell
git clone https://github.com/DikshJaswal/LocalMesh.git
cd LocalMesh
bun install
```

JavaScript dependencies are restored by Bun. `better-sqlite3` stores the database in Electron's application data directory.

## Run the desktop application

```powershell
bun run dev
```

This starts Vite and opens a separate Electron desktop window. Do not open `http://localhost:1420` directly in a normal browser when testing IPC; a normal browser does not have Electron's preload bridge.

## Other commands

```powershell
bun run dev:renderer
bun run build
bun start
```

## Project structure

```text
LocalMesh/
├── electron/                    Electron main process and preload bridge
├── src/                         React + TypeScript renderer
├── docs/                        Contributor and learning documentation
├── package.json                 Bun scripts and dependencies
├── tsconfig.electron.json       Electron TypeScript configuration
└── vite.config.ts               Vite configuration
```

See [`docs/README.md`](docs/README.md).

For the file relationships and runtime flow, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

For the completed and remaining development phases, see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Current implementation status

### Completed

- Electron + React + TypeScript project setup
- TypeScript main process compilation
- React-to-Electron IPC using a context-isolated preload bridge
- IPC handlers for app info, identity, conversations, and messages
- UUID-based local device identity
- Identity persistence in SQLite
- Electron-managed database connection
- SQLite migrations versions 1 and 2
- Device identity, conversations, and messages tables
- Initial database service, peer discovery, and TypeScript checks

### Not completed yet

- LAN message sockets and transport protocol
- Conversation and chat UI
- Peer authentication and encryption
- File transfer
- Screen sharing
- Mobile application
- Performance benchmarks

## Development approach

LocalMesh is built incrementally. Each subsystem is explained, implemented, tested, and committed before the next subsystem is started. Communication must work on a LAN even when Internet access is disabled; no cloud database or cloud transport is planned for LAN communication.
