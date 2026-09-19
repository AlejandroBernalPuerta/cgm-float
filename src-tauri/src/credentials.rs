use keyring::Entry;

const SERVICE_NAME: &str = "cgm-flotante-dexcom";

/// El usuario de Dexcom Share no es secreto por sí solo (se guarda en
/// SQLite vía el frontend); aquí solo se protege la contraseña, usando el
/// almacén de credenciales nativo del sistema operativo en vez de
/// guardarla en texto plano en la base de datos de la app.
pub fn save_password(username: &str, password: &str) -> Result<(), String> {
    Entry::new(SERVICE_NAME, username)
        .map_err(describe_error)?
        .set_password(password)
        .map_err(describe_error)
}

pub fn load_password(username: &str) -> Result<String, String> {
    Entry::new(SERVICE_NAME, username)
        .map_err(describe_error)?
        .get_password()
        .map_err(describe_error)
}

pub fn delete_password(username: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, username).map_err(describe_error)?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(describe_error(err)),
    }
}

fn describe_error(error: keyring::Error) -> String {
    format!("No se pudo acceder al almacén seguro de credenciales del sistema: {error}")
}
