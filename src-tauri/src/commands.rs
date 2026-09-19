use std::collections::HashMap;
use std::sync::Mutex;

use crate::credentials;
use crate::dexcom::{DexcomClient, DexcomError, DexcomRegion, GlucoseReading};

/// Cachea el sessionId por usuario para no re-autenticar en cada sondeo
/// (una sesión de Dexcom Share dura ~24h). Se limpia si una lectura falla
/// por credenciales inválidas, forzando una re-autenticación en el
/// siguiente intento.
#[derive(Default)]
pub struct DexcomSessionState(Mutex<HashMap<String, String>>);

impl DexcomSessionState {
    pub fn new() -> Self {
        Self::default()
    }
}

#[tauri::command]
pub async fn save_dexcom_password(username: String, password: String) -> Result<(), String> {
    if username.trim().is_empty() {
        return Err("El usuario de Dexcom Share no puede estar vacío.".into());
    }
    if password.is_empty() {
        return Err("La contraseña de Dexcom Share no puede estar vacía.".into());
    }
    credentials::save_password(&username, &password)
}

#[tauri::command]
pub async fn clear_dexcom_credentials(
    state: tauri::State<'_, DexcomSessionState>,
    username: String,
) -> Result<(), String> {
    state.0.lock().unwrap().remove(&username);
    credentials::delete_password(&username)
}

#[tauri::command]
pub async fn fetch_dexcom_reading(
    state: tauri::State<'_, DexcomSessionState>,
    username: String,
    region: String,
) -> Result<GlucoseReading, String> {
    let region = DexcomRegion::parse(&region);
    let client = DexcomClient::new(region);
    let password = credentials::load_password(&username)?;

    let cached_session = state.0.lock().unwrap().get(&username).cloned();

    if let Some(session_id) = cached_session {
        match client.fetch_latest_reading(&session_id).await {
            Ok(reading) => return Ok(reading),
            // La sesión cacheada pudo caducar; se descarta y se
            // reautentica una vez antes de rendirse.
            Err(DexcomError::InvalidCredentials) => {
                state.0.lock().unwrap().remove(&username);
            }
            Err(other) => return Err(other.to_string()),
        }
    }

    let session_id = client
        .authenticate(&username, &password)
        .await
        .map_err(|e| e.to_string())?;
    state.0.lock().unwrap().insert(username.clone(), session_id.clone());

    client
        .fetch_latest_reading(&session_id)
        .await
        .map_err(|e| e.to_string())
}
