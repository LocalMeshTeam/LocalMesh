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
