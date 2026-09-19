import { invoke } from "@tauri-apps/api/core";
import type { DexcomRegion } from "../types/dexcom";
import type { GlucoseReading, GlucoseTrend } from "../types/glucose";

interface DexcomReadingDto {
  value: number;
  trend: string;
  timestamp_ms: number;
}

const KNOWN_TRENDS: readonly GlucoseTrend[] = ["rising_fast", "rising", "flat", "falling", "falling_fast", "unknown"];

function toGlucoseTrend(raw: string): GlucoseTrend {
  return (KNOWN_TRENDS as readonly string[]).includes(raw) ? (raw as GlucoseTrend) : "unknown";
}

/** Guarda la contraseña en el almacén de credenciales del sistema operativo (nunca en SQLite). */
export async function saveDexcomPassword(username: string, password: string): Promise<void> {
  await invoke("save_dexcom_password", { username, password });
}

export async function clearDexcomCredentials(username: string): Promise<void> {
  await invoke("clear_dexcom_credentials", { username });
}

/**
 * Autentica (o reutiliza la sesión cacheada en el lado de Rust) y trae la
 * última lectura de Dexcom Share. Lanza si las credenciales son
 * incorrectas, hay un error de red, o no hay lecturas recientes.
 */
export async function fetchDexcomReading(username: string, region: DexcomRegion): Promise<GlucoseReading> {
  const dto = await invoke<DexcomReadingDto>("fetch_dexcom_reading", { username, region });
  return {
    value: dto.value,
    trend: toGlucoseTrend(dto.trend),
    timestamp: new Date(dto.timestamp_ms),
  };
}
