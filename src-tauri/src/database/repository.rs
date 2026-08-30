use rusqlite::{params, Connection, OptionalExtension};

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
