# LocalMesh Learning Guide

This document describes the languages, tools, and concepts used in LocalMesh. It is a learning map, not a claim that the entire project is finished.

## TypeScript and React

Used for the frontend. Learn types, interfaces, functions, promises, `async`/`await`, error handling, components, props, state, `useEffect`, conditional rendering, loading/error states, and service modules.

Status: basic identity screen and Tauri invocation are implemented; chat and networking UI are not.

## Vite and pnpm

Vite serves and builds the frontend. pnpm installs JavaScript dependencies and runs scripts from `package.json`.

Learn `package.json`, lockfiles, development servers, production builds, and why `pnpm tauri dev` differs from `pnpm dev`.

Status: project setup and build workflow are complete.

## Rust

Used for native logic, persistence, and future networking. Learn in this order:

1. Variables, mutability, functions, expressions
2. `String` and `&str`
3. Structs and enums
4. `impl` blocks
5. Modules and `pub`
6. Ownership and borrowing
7. `Option` and `Result`
8. Pattern matching
9. Traits
10. Generics and iterators
11. Closures
12. Async/await and Tokio
13. Threads and channels
14. `Mutex`, `RwLock`, and shared state

Status: structs, `impl`, modules, `Result`, Serde, UUIDs, borrowing, SQLite, and managed state are present. Async networking has not started.

## Tauri 2

Used to package the frontend as a desktop app and bridge TypeScript to Rust.

Learn WebView, commands, IPC, command registration, Serde serialization, `AppHandle`, managed state, events, filesystem/path APIs, and desktop/mobile differences.

Status: commands, IPC, startup setup, and managed state are implemented. Events and mobile behavior are not.

## SQLite and SQL

Used for local persistence. Learn databases, tables, rows, columns, primary keys, foreign keys, indexes, migrations, parameterized queries, transactions, repositories, and database error handling.

Status: SQLite connection, migrations, identity storage, conversation/message schema, repositories, and tests are implemented. IPC access and complete CRUD are not.

## Future networking concepts

Not implemented yet: LAN, subnets, IP addresses, ports, TCP, UDP, sockets, framing, serialization protocols, timeouts, reconnects, broadcast, multicast, mDNS, peer discovery, async networking, firewalls, and hotspot limitations.

## Future product concepts

Not implemented yet: message delivery lifecycle, file streaming, chunking, checksums, throughput measurement, peer authentication, encryption, key management, screen capture, consent, Android permissions, and mobile networking.

## Current checkpoint

```text
React invokes a registered Tauri command.
Tauri calls Rust.
Rust uses a service and repository.
The repository reads or writes SQLite.
The result returns to React.
```

The project is intentionally incomplete. The next learning step is exposing conversation and message repositories through Tauri IPC, followed by the LAN networking foundation.
