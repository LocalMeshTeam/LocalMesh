#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Conversation {
    pub conversation_id: String,
    pub peer_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Message {
    pub message_id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub receiver_id: String,
    pub content: String,
    pub timestamp: String,
    pub status: String,
}
