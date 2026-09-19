import { useEffect, useRef } from "react";
import { useGlucoseStore } from "../stores/useGlucoseStore";
import type { GlucoseReading, GlucoseTrend } from "../types/glucose";

const MOCK_UPDATE_INTERVAL_MS = 10_000;
const MIN_VALUE = 55;
const MAX_VALUE = 260;
const MAX_STEP = 8;
const INITIAL_VALUE = 120;

function trendFromDelta(delta: number): GlucoseTrend {
  if (delta > 4) return "rising_fast";
  if (delta > 1) return "rising";
  if (delta < -4) return "falling_fast";
  if (delta < -1) return "falling";
  return "flat";
}

/**
 * Genera lecturas simuladas mediante un paseo aleatorio acotado a
 * [MIN_VALUE, MAX_VALUE], emulando la cadencia de un sensor CGM real.
 * Se usa como resguardo mientras no haya una cuenta de Dexcom Share
 * conectada (ver `useGlucosePolling`); `active` permite apagarlo sin
 * romper las reglas de hooks de React cuando sí la hay.
 */
export function useMockGlucose(active: boolean): void {
  const setReading = useGlucoseStore((state) => state.setReading);
  const previousValueRef = useRef<number>(INITIAL_VALUE);

  useEffect(() => {
    if (!active) return;

    const emitReading = () => {
      const step = Math.round((Math.random() - 0.5) * 2 * MAX_STEP);
      const nextValue = Math.min(MAX_VALUE, Math.max(MIN_VALUE, previousValueRef.current + step));
      const delta = nextValue - previousValueRef.current;
      previousValueRef.current = nextValue;

      const reading: GlucoseReading = {
        value: nextValue,
        trend: trendFromDelta(delta),
        timestamp: new Date(),
      };
      setReading(reading);
    };

    emitReading();
    const intervalId = window.setInterval(emitReading, MOCK_UPDATE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [active, setReading]);
}
