import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useGlucoseStore } from "../stores/useGlucoseStore";
import { useSettingsStore } from "../stores/useSettingsStore";

/**
 * Refleja la última lectura en el icono de la bandeja del sistema (no
 * solo en el widget flotante), para poder ver el valor sin tener que
 * abrir la ventana. El renderizado del icono ocurre en Rust
 * (ver src-tauri/src/tray_icon.rs); aquí solo se decide cuándo y con qué
 * valores invocarlo.
 */
export function useTrayGlucoseIcon(): void {
  const reading = useGlucoseStore((state) => state.reading);
  const targetRange = useSettingsStore((state) => state.targetRange);

  useEffect(() => {
    if (!reading) return;
    const inRange = reading.value >= targetRange.min && reading.value <= targetRange.max;
    invoke("update_tray_glucose", { value: reading.value, inRange }).catch((error) =>
      console.error("No se pudo actualizar el icono de la bandeja:", error)
    );
  }, [reading, targetRange]);
}
