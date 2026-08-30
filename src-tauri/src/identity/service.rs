use std::time::{SystemTime, UNIX_EPOCH};

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
}