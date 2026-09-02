# LocalMesh Learning Guide

This document describes the languages, tools, and concepts used in LocalMesh. It is a learning map, not a claim that the entire project is finished.

## TypeScript and React

Used for the frontend. Learn types, interfaces, functions, promises, `async`/`await`, error handling, components, props, state, `useEffect`, conditional rendering, loading/error states, and service modules.

Status: basic identity screen and Electron IPC are implemented; chat and networking UI are not.

## Vite and Bun

Vite serves and builds the frontend. Bun installs JavaScript dependencies and runs scripts from `package.json`.

Learn `package.json`, lockfiles, development servers, production builds, and why `bun run dev` starts both Vite and Electron.

Status: project setup and build workflow are complete.

## Electron and TypeScript

The Electron main process handles desktop logic, persistence, and future networking. Learn typed modules, promises, Electron windows, context isolation, preload scripts, IPC handlers, and Node filesystem APIs.

## Electron IPC

Used to package the frontend as a desktop app and bridge the renderer to the TypeScript main process.

Learn BrowserWindow, IPC, context isolation, preload scripts, events, filesystem/path APIs, and desktop/mobile differences.

Status: IPC handlers, startup setup, a context-isolated preload bridge, and database ownership are implemented.

## SQLite and SQL

Used for local persistence. Learn databases, tables, rows, columns, primary keys, foreign keys, indexes, migrations, parameterized queries, transactions, repositories, and database error handling.

Status: SQLite connection, migrations, identity storage, and the conversation/message schema are implemented. Complete CRUD and IPC access are future work.

## Future networking concepts

Not implemented yet: LAN, subnets, IP addresses, ports, TCP, UDP, sockets, framing, serialization protocols, timeouts, reconnects, broadcast, multicast, mDNS, peer discovery, async networking, firewalls, and hotspot limitations.

## Future product concepts

Not implemented yet: message delivery lifecycle, file streaming, chunking, checksums, throughput measurement, peer authentication, encryption, key management, screen capture, consent, Android permissions, and mobile networking.

## Current checkpoint

```text
React calls a typed preload API.
Electron routes the request to the main process.
The TypeScript service uses a database repository.
The repository reads or writes SQLite.
The result returns to React.
```

The project is intentionally incomplete. Conversation and message operations are now available in the backend through Electron IPC. The next learning step is the LAN networking foundation; the frontend will consume these APIs later.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the file map, runtime flow, and CI/CD explanation.
The desktop runtime is Electron and all application logic is TypeScript. Use Bun for package installation and scripts. The renderer communicates with the Electron main process through the context-isolated preload bridge exposed as `window.localmesh`.
