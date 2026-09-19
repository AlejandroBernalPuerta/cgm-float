mod commands;
mod credentials;
mod dexcom;
mod storage;
mod tray;
mod tray_icon;
mod window;

/// Construye y ejecuta la aplicación: registra el plugin SQL con sus
/// migraciones, crea el icono de bandeja y engancha el manejador que evita
/// que cerrar la ventana principal (X) termine el proceso.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cgm_float.db", storage::db::migrations())
                .build(),
        )
        .manage(commands::DexcomSessionState::new())
        .invoke_handler(tauri::generate_handler![
            commands::save_dexcom_password,
            commands::clear_dexcom_credentials,
            commands::fetch_dexcom_reading,
            tray_icon::update_tray_glucose,
        ])
        .setup(|app| {
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == window::MAIN_WINDOW_LABEL {
                window::handle_window_event(window, event);
            }
        })
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación CGM Flotante");
}
