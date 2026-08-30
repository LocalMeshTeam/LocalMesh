use rusqlite::{params, Connection, OptionalExtension};

use super::models::{Conversation, Message};
use crate::identity::model::DeviceIdentity;

pub struct DeviceIdentityRepository;

impl DeviceIdentityRepository {
    pub fn find(connection: &Connection) -> Result<Option<DeviceIdentity>, String> {
        connection
            .query_row(
                "SELECT device_id, device_name, display_name, created_at FROM device_identity LIMIT 1",
                [],
                |row| {
                    Ok(DeviceIdentity {
                        device_id: row.get(0)?,
                        device_name: row.get(1)?,
                        display_name: row.get(2)?,
                        created_at: row.get(3)?,
                    })
                },
            )
            .optional()
            .map_err(|error| format!("failed to load device identity: {error}"))
    }

    pub fn save(connection: &Connection, identity: &DeviceIdentity) -> Result<(), String> {
        connection
            .execute(
                "INSERT INTO device_identity (device_id, device_name, display_name, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![
                    identity.device_id,
                    identity.device_name,
                    identity.display_name,
                    identity.created_at,
                ],
            )
            .map_err(|error| format!("failed to save device identity: {error}"))?;

        Ok(())
    }
}

pub struct ConversationRepository;

impl ConversationRepository {
    pub fn save(connection: &Connection, conversation: &Conversation) -> Result<(), String> {
        connection
            .execute(
                "INSERT INTO conversations (conversation_id, peer_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                params![
                    conversation.conversation_id,
                    conversation.peer_id,
                    conversation.created_at,
                    conversation.updated_at,
                ],
            )
            .map_err(|error| format!("failed to save conversation: {error}"))?;

        Ok(())
    }
}

pub struct MessageRepository;

impl MessageRepository {
    pub fn save(connection: &Connection, message: &Message) -> Result<(), String> {
        connection
            .execute(
                "INSERT INTO messages (message_id, conversation_id, sender_id, receiver_id, content, timestamp, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    message.message_id,
                    message.conversation_id,
                    message.sender_id,
                    message.receiver_id,
                    message.content,
                    message.timestamp,
                    message.status,
                ],
            )
            .map_err(|error| format!("failed to save message: {error}"))?;

        Ok(())
    }

    pub fn list_for_conversation(
        connection: &Connection,
        conversation_id: &str,
    ) -> Result<Vec<Message>, String> {
        let mut statement = connection
            .prepare(
                "SELECT message_id, conversation_id, sender_id, receiver_id, content, timestamp, status FROM messages WHERE conversation_id = ?1 ORDER BY timestamp ASC",
            )
            .map_err(|error| format!("failed to prepare message query: {error}"))?;

        let messages = statement
            .query_map([conversation_id], |row| {
                Ok(Message {
                    message_id: row.get(0)?,
                    conversation_id: row.get(1)?,
                    sender_id: row.get(2)?,
                    receiver_id: row.get(3)?,
                    content: row.get(4)?,
                    timestamp: row.get(5)?,
                    status: row.get(6)?,
                })
            })
            .map_err(|error| format!("failed to query messages: {error}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("failed to read message row: {error}"))?;

        Ok(messages)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::connection::run_migrations;

    #[test]
    fn messages_are_stored_and_loaded_for_a_conversation() {
        let connection = Connection::open_in_memory().expect("database should open");
        run_migrations(&connection).expect("migrations should succeed");

        let conversation = Conversation {
            conversation_id: "conversation-1".to_string(),
            peer_id: "peer-1".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        };
        ConversationRepository::save(&connection, &conversation)
            .expect("conversation should be saved");

        let message = Message {
            message_id: "message-1".to_string(),
            conversation_id: conversation.conversation_id.clone(),
            sender_id: "sender-1".to_string(),
            receiver_id: "peer-1".to_string(),
            content: "Hello LAN".to_string(),
            timestamp: "2026-01-01T00:01:00Z".to_string(),
            status: "sent".to_string(),
        };
        MessageRepository::save(&connection, &message).expect("message should be saved");

        let messages = MessageRepository::list_for_conversation(&connection, "conversation-1")
            .expect("messages should be loaded");

        assert_eq!(messages, vec![message]);
    }

    #[test]
    fn messages_require_an_existing_conversation() {
        let connection = Connection::open_in_memory().expect("database should open");
        run_migrations(&connection).expect("migrations should succeed");

        let message = Message {
            message_id: "message-1".to_string(),
            conversation_id: "missing-conversation".to_string(),
            sender_id: "sender-1".to_string(),
            receiver_id: "peer-1".to_string(),
            content: "Orphan".to_string(),
            timestamp: "2026-01-01T00:01:00Z".to_string(),
            status: "failed".to_string(),
        };

        assert!(MessageRepository::save(&connection, &message).is_err());
    }
}
