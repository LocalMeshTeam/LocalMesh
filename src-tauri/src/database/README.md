# LocalMesh Database

LocalMesh uses SQLite as a local database. It is stored on the user's device and is not a cloud database. SQLite stores application data; it does not send messages between devices.

## Location on Windows

```text
C:\Users\<user>\AppData\Roaming\com.localmesh.app\localmesh.db
```

The database opens when Tauri starts. The connection is stored in `AppState` and reused by commands.

## Flow

```text
Tauri startup → open localmesh.db → run migrations → AppState → repositories execute SQL
```

## Files

- `mod.rs`: exports database modules and `AppState`.
- `connection.rs`: opens SQLite and creates the schema.
- `state.rs`: stores the shared `rusqlite::Connection` in a `Mutex`.
- `models.rs`: defines `Conversation` and `Message` structs.
- `repository.rs`: contains database read/write operations.

## Current schema

### `schema_migrations`

Tracks applied migration versions: `version` is the primary key and `applied_at` stores the UTC timestamp.

### `device_identity`

Stores the local identity: `device_id` primary key, `device_name`, `display_name`, and `created_at`.

### `conversations`

Stores `conversation_id` primary key, `peer_id`, `created_at`, and `updated_at`.

### `messages`

Stores `message_id` primary key, `conversation_id`, `sender_id`, `receiver_id`, `content`, `timestamp`, and `status`. `conversation_id` is a foreign key to `conversations`, with an index for conversation queries.

## Completed

- SQLite is compiled into the application through `rusqlite`'s `bundled` feature.
- Database directory and file are created automatically.
- Shared database state is managed by Tauri.
- Migration versions 1 and 2 create the current tables.
- Device identity is loaded from and saved to SQLite.
- Conversation and message repository operations are implemented and tested.

## Not completed yet

- Conversation/message Tauri IPC commands
- React chat interface
- Full migration runner with separate migration files
- Peer table and peer repository
- File-transfer metadata table
- Settings table
- Transactions around larger workflows
- Database integration tests through the running Tauri application

## Boundary

SQLite persists data locally. It does not perform LAN discovery, open sockets, transfer messages, or replace the future networking layer.
