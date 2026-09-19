use tauri::{AppHandle, Manager, WindowEvent};

pub const MAIN_WINDOW_LABEL: &str = "main";
pub const SETTINGS_WINDOW_LABEL: &str = "settings";

/// Intercepta el cierre nativo (botón X / Alt+F4) y oculta la ventana en
/// vez de destruirla, para que la app siga viva en la bandeja del sistema
/// hasta que el usuario elija "Salir" explícitamente desde el menú de la
/// bandeja (ver tray.rs).
pub fn handle_window_event(window: &tauri::Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        if let Err(err) = window.hide() {
            eprintln!("No se pudo ocultar la ventana principal al cerrar: {err}");
        }
    }
}

/// Alterna la visibilidad de la ventana principal. Usado por el click del
/// icono de bandeja y por su entrada de menú "Mostrar/Ocultar".
pub fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        eprintln!("No se encontró la ventana '{MAIN_WINDOW_LABEL}' para alternar su visibilidad");
        return;
    };

    let is_visible = window.is_visible().unwrap_or(false);
    let result = if is_visible {
        window.hide()
    } else {
        window.show().and_then(|_| window.set_focus())
    };

    if let Err(err) = result {
        eprintln!("No se pudo alternar la visibilidad de la ventana principal: {err}");
    }
}

/// Muestra la ventana de configuración de Dexcom (declarada oculta por
/// defecto en tauri.conf.json). A diferencia de la ventana principal, esta
/// sí se cierra de verdad al pulsar su X: es un diálogo puntual, no un
/// widget residente en bandeja.
pub fn show_settings_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) else {
        eprintln!("No se encontró la ventana '{SETTINGS_WINDOW_LABEL}'");
        return;
    };

    if let Err(err) = window.show().and_then(|_| window.set_focus()) {
        eprintln!("No se pudo mostrar la ventana de configuración: {err}");
    }
}
