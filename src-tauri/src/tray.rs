use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

use crate::window;

/// Crea el icono de bandeja del sistema con un menú "Mostrar/Ocultar" +
/// "Salir", y hace que un click izquierdo sobre el icono también alterne
/// la visibilidad de la ventana (comportamiento habitual de widgets tipo
/// tray-app).
pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Mostrar/Ocultar", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Configuración de Dexcom…", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle_item, &settings_item, &quit_item])?;

    let icon = app.default_window_icon().cloned().ok_or_else(|| {
        tauri::Error::AssetNotFound(
            "No hay icono de app configurado en tauri.conf.json (bundle.icon) para usar en la bandeja".into(),
        )
    })?;

    let tray = TrayIconBuilder::with_id("cgm-flotante-tray")
        .icon(icon)
        .menu(&menu)
        .tooltip("CGM Flotante")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => window::toggle_main_window(app),
            "settings" => window::show_settings_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Solo el clic izquierdo (al soltar) alterna la ventana; el
            // derecho ya está reservado para abrir el menú.
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                window::toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    // Se guarda como estado gestionado para poder actualizar su icono
    // dinámicamente con el valor de glucosa (ver tray_icon.rs).
    app.manage(tray);

    Ok(())
}
