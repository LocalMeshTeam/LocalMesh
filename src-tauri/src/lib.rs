mod database;
mod identity;

use tauri::Manager;

#[tauri::command]
fn get_app_info() -> String {
    "LocalMesh native engine is running.".to_string()
}

#[tauri::command]
fn get_device_identity(app: tauri::AppHandle) -> Result<identity::model::DeviceIdentity, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to locate app data directory: {error}"))?;

    let connection = database::connection::open(&app_data_dir)?;

    identity::service::IdentityService::load_or_create(
        &connection,
        "LOCALMESH-PC".to_string(),
        "LocalMesh User".to_string(),
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to locate app data directory");

            database::connection::initialize(&app_data_dir)
                .expect("failed to initialize LocalMesh database");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_app_info, get_device_identity])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
