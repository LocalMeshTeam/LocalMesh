use std::{fs, path::Path};

use rusqlite::Connection;

const DATABASE_FILE_NAME: &str = "localmesh.db";

pub fn open(app_data_dir: &Path) -> Result<Connection, String> {
    fs::create_dir_all(app_data_dir)
        .map_err(|error| format!("failed to create database directory: {error}"))?;

    let database_path = app_data_dir.join(DATABASE_FILE_NAME);
    let connection = Connection::open(&database_path)
        .map_err(|error| format!("failed to open SQLite database: {error}"))?;

    run_migrations(&connection)?;
    Ok(connection)
}

pub fn run_migrations(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS device_identity (
                device_id TEXT PRIMARY KEY NOT NULL,
                device_name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            INSERT OR IGNORE INTO schema_migrations (version, applied_at)
            VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id TEXT PRIMARY KEY NOT NULL,
                peer_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                message_id TEXT PRIMARY KEY NOT NULL,
                conversation_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
                ON messages(conversation_id);

            INSERT OR IGNORE INTO schema_migrations (version, applied_at)
            VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
            ",
        )
        .map_err(|error| format!("failed to run database migrations: {error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::run_migrations;
    use rusqlite::Connection;

    #[test]
    fn migration_creates_required_tables() {
        let connection = Connection::open_in_memory().expect("in-memory database should open");

        run_migrations(&connection).expect("migration should succeed");

        let table_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('schema_migrations', 'device_identity', 'conversations', 'messages')",
                [],
                |row| row.get(0),
            )
            .expect("table count query should succeed");

        assert_eq!(table_count, 4);

        let migration_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version IN (1, 2)",
                [],
                |row| row.get(0),
            )
            .expect("migration query should succeed");

        assert_eq!(migration_count, 2);
    }
}
