# LocalMesh Rust/Tauri Backend

This folder contains the native backend of LocalMesh. Tauri creates the desktop window and exposes selected Rust functions to the React frontend through IPC.

## Backend flow

```text
React/TypeScript → invoke() → Tauri command → Rust service/repository → SQLite or future LAN networking
```

## Structure

```text
src-tauri/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── identity/
│   │   ├── mod.rs
│   │   ├── model.rs
│   │   └── service.rs
│   └── database/
│       ├── mod.rs
│       ├── state.rs
│       ├── connection.rs
│       ├── models.rs
│       └── repository.rs
├── Cargo.toml
├── Cargo.lock
└── tauri.conf.json
```

## Important files

- `src/main.rs`: native executable entry point; calls `run()`.
- `src/lib.rs`: Tauri setup, command registration, startup database initialization, and managed state.
- `src/identity/model.rs`: defines the serializable `DeviceIdentity` data structure.
- `src/identity/service.rs`: creates identities and coordinates identity loading/saving.
- `src/database/connection.rs`: opens `localmesh.db`, enables foreign keys, and runs migrations.
- `src/database/state.rs`: stores the shared SQLite connection in `AppState`.
- `src/database/models.rs`: defines `Conversation` and `Message` Rust structs.
- `src/database/repository.rs`: contains database read/write operations.
- `Cargo.toml`: Rust dependencies and package configuration.
- `tauri.conf.json`: app identifier, window, Vite URL, build, and packaging configuration.

## Current status

Device identity travels from Rust to React through Tauri IPC and is persisted in SQLite. Conversation/message repositories exist and are tested, but are not yet exposed as Tauri commands. Networking, discovery, security, and mobile behavior have not been implemented.

For database details, see [`src/database/README.md`](src/database/README.md).
