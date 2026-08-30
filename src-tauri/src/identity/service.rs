use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;
use uuid::Uuid;

use crate::database::repository::DeviceIdentityRepository;

use super::model::DeviceIdentity;

pub struct IdentityService;

impl IdentityService {
    pub fn create(device_name: String, display_name: String) -> DeviceIdentity {
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time is before UNIX epoch")
            .as_secs()
            .to_string();

        DeviceIdentity {
            device_id: Uuid::new_v4().to_string(),
            device_name,
            display_name,
            created_at,
        }
    }

    pub fn load_or_create(
        connection: &Connection,
        device_name: String,
        display_name: String,
    ) -> Result<DeviceIdentity, String> {
        if let Some(identity) = DeviceIdentityRepository::find(connection)? {
            return Ok(identity);
        }

        let identity = Self::create(device_name, display_name);
        DeviceIdentityRepository::save(connection, &identity)?;

        Ok(identity)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_generates_a_valid_identity() {
        let identity = IdentityService::create("TEST-PC".to_string(), "Test User".to_string());

        assert!(Uuid::parse_str(&identity.device_id).is_ok());
        assert_eq!(identity.device_name, "TEST-PC");
        assert_eq!(identity.display_name, "Test User");
        assert!(!identity.created_at.is_empty());
    }

    #[test]
    fn load_or_create_reuses_the_saved_identity() {
        let connection = rusqlite::Connection::open_in_memory().expect("database should open");
        crate::database::connection::run_migrations(&connection)
            .expect("database migration should succeed");

        let first_identity = IdentityService::load_or_create(
            &connection,
            "TEST-PC".to_string(),
            "Test User".to_string(),
        )
        .expect("first identity should be created");

        let loaded_identity = IdentityService::load_or_create(
            &connection,
            "A-DIFFERENT-NAME".to_string(),
            "A Different User".to_string(),
        )
        .expect("saved identity should be loaded");

        assert_eq!(first_identity.device_id, loaded_identity.device_id);
        assert_eq!(first_identity.device_name, loaded_identity.device_name);
        assert_eq!(first_identity.display_name, loaded_identity.display_name);
        assert_eq!(first_identity.created_at, loaded_identity.created_at);
    }
}
