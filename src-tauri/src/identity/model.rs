#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceIdentity {
    pub device_id: String,
    pub device_name: String,
    pub display_name: String,
    pub created_at: String,
}