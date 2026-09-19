// Punto de entrada mínimo: toda la lógica vive en lib.rs para poder
// reutilizarse en targets móviles (tauri::mobile_entry_point), siguiendo
// la convención estándar de los proyectos Tauri 2.x.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    cgm_flotante_lib::run();
}
