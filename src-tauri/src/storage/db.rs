use tauri_plugin_sql::{Migration, MigrationKind};

/// Migraciones para la base local `cgm_float.db`.
///
/// `user_settings` guarda una única fila (id fijo = 1, forzado por el
/// CHECK) con la posición/tamaño del widget y el rango objetivo de
/// glucosa. Se usa una fila fija en vez de una tabla key-value o de
/// histórico porque solo existe una instancia del widget por usuario; el
/// frontend hace UPDATE sobre esa fila (ver src/lib/db.ts).
pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_user_settings_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS user_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    widget_x INTEGER NOT NULL DEFAULT 100,
                    widget_y INTEGER NOT NULL DEFAULT 100,
                    widget_width INTEGER NOT NULL DEFAULT 220,
                    widget_height INTEGER NOT NULL DEFAULT 140,
                    target_range_min INTEGER NOT NULL DEFAULT 70,
                    target_range_max INTEGER NOT NULL DEFAULT 180
                );
                INSERT OR IGNORE INTO user_settings (id) VALUES (1);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            // Solo el usuario y la región de Dexcom Share (no secretos):
            // la contraseña vive en el almacén de credenciales del SO
            // (ver src-tauri/src/credentials.rs), nunca en esta tabla.
            description: "create_dexcom_settings_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS dexcom_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    username TEXT NOT NULL DEFAULT '',
                    region TEXT NOT NULL DEFAULT 'us',
                    enabled INTEGER NOT NULL DEFAULT 0
                );
                INSERT OR IGNORE INTO dexcom_settings (id) VALUES (1);
            "#,
            kind: MigrationKind::Up,
        },
    ]
}
