import Database from "@tauri-apps/plugin-sql";
import type { WidgetGeometry } from "../types/settings";
import type { DexcomSettings } from "../types/dexcom";

const DB_URL = "sqlite:cgm_float.db";
const SETTINGS_ROW_ID = 1;

let dbInstance: Database | null = null;

/**
 * `Database.load` abre (o crea, según el driver) el archivo SQLite y
 * ejecuta las migraciones registradas en el lado de Rust
 * (ver src-tauri/src/storage/db.rs). Se cachea la instancia porque abrir
 * la conexión repetidamente en cada llamada es innecesario y costoso.
 */
async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_URL);
  }
  return dbInstance;
}

export interface UserSettingsRow {
  id: number;
  widget_x: number;
  widget_y: number;
  widget_width: number;
  widget_height: number;
  target_range_min: number;
  target_range_max: number;
}

export async function fetchUserSettings(): Promise<UserSettingsRow> {
  let db: Database;
  try {
    db = await getDb();
  } catch (error) {
    throw new Error(`No se pudo abrir la base de datos local: ${describeError(error)}`);
  }

  let rows: UserSettingsRow[];
  try {
    rows = await db.select<UserSettingsRow[]>(
      "SELECT id, widget_x, widget_y, widget_width, widget_height, target_range_min, target_range_max " +
        "FROM user_settings WHERE id = $1",
      [SETTINGS_ROW_ID]
    );
  } catch (error) {
    throw new Error(`No se pudo leer la configuración del usuario: ${describeError(error)}`);
  }

  const row = rows[0];
  if (!row) {
    throw new Error(
      "No existe la fila de configuración por defecto (id = 1) en 'user_settings'; revisa que la migración se haya aplicado."
    );
  }
  return row;
}

export async function saveWidgetGeometry(geometry: WidgetGeometry): Promise<void> {
  const { x, y, width, height } = geometry;
  if (![x, y, width, height].every(Number.isFinite)) {
    throw new Error("Geometría de ventana inválida: se recibieron valores no numéricos.");
  }
  if (width <= 0 || height <= 0) {
    throw new Error("Geometría de ventana inválida: ancho/alto deben ser positivos.");
  }

  const db = await getDb();
  try {
    await db.execute(
      "UPDATE user_settings SET widget_x = $1, widget_y = $2, widget_width = $3, widget_height = $4 WHERE id = $5",
      [Math.round(x), Math.round(y), Math.round(width), Math.round(height), SETTINGS_ROW_ID]
    );
  } catch (error) {
    throw new Error(`No se pudo guardar la posición/tamaño del widget: ${describeError(error)}`);
  }
}

export async function saveTargetRange(min: number, max: number): Promise<void> {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("Rango objetivo inválido: los límites deben ser numéricos.");
  }
  if (min >= max) {
    throw new Error("Rango objetivo inválido: el mínimo debe ser menor que el máximo.");
  }

  const db = await getDb();
  try {
    await db.execute("UPDATE user_settings SET target_range_min = $1, target_range_max = $2 WHERE id = $3", [
      Math.round(min),
      Math.round(max),
      SETTINGS_ROW_ID,
    ]);
  } catch (error) {
    throw new Error(`No se pudo guardar el rango objetivo: ${describeError(error)}`);
  }
}

interface DexcomSettingsRow {
  id: number;
  username: string;
  region: string;
  enabled: number;
}

export async function fetchDexcomSettings(): Promise<DexcomSettings> {
  const db = await getDb();
  let rows: DexcomSettingsRow[];
  try {
    rows = await db.select<DexcomSettingsRow[]>(
      "SELECT id, username, region, enabled FROM dexcom_settings WHERE id = $1",
      [SETTINGS_ROW_ID]
    );
  } catch (error) {
    throw new Error(`No se pudo leer la configuración de Dexcom: ${describeError(error)}`);
  }

  const row = rows[0];
  if (!row) {
    throw new Error("No existe la fila de configuración por defecto (id = 1) en 'dexcom_settings'.");
  }
  return {
    username: row.username,
    region: row.region === "us" ? "us" : "ous",
    enabled: row.enabled === 1,
  };
}

export async function saveDexcomSettings(settings: DexcomSettings): Promise<void> {
  const db = await getDb();
  try {
    await db.execute("UPDATE dexcom_settings SET username = $1, region = $2, enabled = $3 WHERE id = $4", [
      settings.username,
      settings.region,
      settings.enabled ? 1 : 0,
      SETTINGS_ROW_ID,
    ]);
  } catch (error) {
    throw new Error(`No se pudo guardar la configuración de Dexcom: ${describeError(error)}`);
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
