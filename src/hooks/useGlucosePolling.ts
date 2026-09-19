import { useEffect, useRef } from "react";
import { fetchDexcomReading } from "../lib/dexcom";
import { useDexcomStore } from "../stores/useDexcomStore";
import { useGlucoseStore } from "../stores/useGlucoseStore";

// Dexcom Share solo actualiza cada ~5 minutos; sondear cada 60s es
// suficiente para notar la lectura nueva casi de inmediato sin acercarse
// a límites de uso razonables de una API no oficial.
const POLL_INTERVAL_MS = 60_000;

/**
 * Sondea Dexcom Share cuando hay una cuenta configurada y activada
 * (`useDexcomStore`). Si una lectura falla (red, credenciales caducadas,
 * etc.) se registra el error y se conserva la última lectura válida en
 * pantalla en vez de dejar el widget en blanco.
 */
export function useGlucosePolling(): { isPolling: boolean; lastError: string | null } {
  const enabled = useDexcomStore((state) => state.enabled);
  const username = useDexcomStore((state) => state.username);
  const region = useDexcomStore((state) => state.region);
  const setReading = useGlucoseStore((state) => state.setReading);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !username) return;

    let isCancelled = false;

    const poll = async () => {
      try {
        const reading = await fetchDexcomReading(username, region);
        if (!isCancelled) {
          lastErrorRef.current = null;
          setReading(reading);
        }
      } catch (error) {
        lastErrorRef.current = error instanceof Error ? error.message : String(error);
        console.error("Error al obtener la lectura de Dexcom Share:", error);
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, username, region, setReading]);

  return { isPolling: enabled && Boolean(username), lastError: lastErrorRef.current };
}
