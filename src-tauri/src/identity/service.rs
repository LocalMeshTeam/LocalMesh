use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use uuid::Uuid;

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
        file_path: &Path,
        device_name: String,
        display_name: String,
    ) -> Result<DeviceIdentity, String> {
        if file_path.exists() {
            let contents = fs::read_to_string(file_path)
                .map_err(|error| format!("failed to read device identity: {error}"))?;

            return serde_json::from_str(&contents)
                .map_err(|error| format!("failed to parse device identity: {error}"));
        }

        let identity = Self::create(device_name, display_name);
        let contents = serde_json::to_string_pretty(&identity)
            .map_err(|error| format!("failed to serialize device identity: {error}"))?;

        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("failed to create identity directory: {error}"))?;
        }

        fs::write(file_path, contents)
            .map_err(|error| format!("failed to save device identity: {error}"))?;

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
        let test_directory = std::env::temp_dir().join(format!("localmesh-{}", Uuid::new_v4()));
        let identity_path = test_directory.join("device_identity.json");

        let first_identity = IdentityService::load_or_create(
            &identity_path,
            "TEST-PC".to_string(),
            "Test User".to_string(),
        )
        .expect("first identity should be created");

        let loaded_identity = IdentityService::load_or_create(
            &identity_path,
            "A-DIFFERENT-NAME".to_string(),
            "A Different User".to_string(),
        )
        .expect("saved identity should be loaded");

        assert_eq!(first_identity.device_id, loaded_identity.device_id);
        assert_eq!(first_identity.device_name, loaded_identity.device_name);
        assert_eq!(first_identity.display_name, loaded_identity.display_name);
        assert_eq!(first_identity.created_at, loaded_identity.created_at);

        std::fs::remove_dir_all(test_directory).expect("test directory should be removed");
    }

    #[test]
    fn invalid_saved_identity_returns_an_error() {
        let test_directory = std::env::temp_dir().join(format!("localmesh-{}", Uuid::new_v4()));
        let identity_path = test_directory.join("device_identity.json");

        std::fs::create_dir_all(&test_directory).expect("test directory should be created");
        std::fs::write(&identity_path, "not valid JSON").expect("invalid data should be written");

        let result = IdentityService::load_or_create(
            &identity_path,
            "TEST-PC".to_string(),
            "Test User".to_string(),
        );

        assert!(result.is_err());
        std::fs::remove_dir_all(test_directory).expect("test directory should be removed");
    }
}
