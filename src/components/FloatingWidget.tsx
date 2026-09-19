import { useEffect, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useGlucoseStore } from "../stores/useGlucoseStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useDexcomStore } from "../stores/useDexcomStore";
import { useMockGlucose } from "../hooks/useMockGlucose";
import { useGlucosePolling } from "../hooks/useGlucosePolling";
import { useTrayGlucoseIcon } from "../hooks/useTrayGlucoseIcon";
import { useWindowDrag } from "../hooks/useWindowDrag";
import { GlucoseDisplay } from "./GlucoseDisplay";
import { ResizeHandle } from "./ResizeHandle";

const IN_RANGE_BACKGROUND = "rgba(20, 130, 70, 0.94)";
const OUT_OF_RANGE_BACKGROUND = "rgba(170, 40, 40, 0.94)";
const UNKNOWN_BACKGROUND = "rgba(55, 55, 60, 0.94)";

export function FloatingWidget() {
  const loadDexcomSettings = useDexcomStore((state) => state.loadSettings);
  const dexcomEnabled = useDexcomStore((state) => state.enabled);

  useEffect(() => {
    loadDexcomSettings();
  }, [loadDexcomSettings]);

  // Solo uno de los dos alimenta el store de lecturas a la vez: el mock
  // se apaga en cuanto hay una cuenta de Dexcom Share conectada.
  useMockGlucose(!dexcomEnabled);
  useGlucosePolling();
  useTrayGlucoseIcon();

  const reading = useGlucoseStore((state) => state.reading);
  const targetRange = useSettingsStore((state) => state.targetRange);
  const { onDragHandleMouseDown } = useWindowDrag();

  const backgroundColor = useMemo(() => {
    if (!reading) return UNKNOWN_BACKGROUND;
    const inRange = reading.value >= targetRange.min && reading.value <= targetRange.max;
    return inRange ? IN_RANGE_BACKGROUND : OUT_OF_RANGE_BACKGROUND;
  }, [reading, targetRange]);

  const handleHideToTray = () => {
    getCurrentWindow()
      .hide()
      .catch((error) => console.error("No se pudo ocultar el widget en la bandeja:", error));
  };

  return (
    <div className="floating-widget" style={{ backgroundColor }} onMouseDown={onDragHandleMouseDown}>
      <button
        type="button"
        className="floating-widget__hide-button"
        onClick={handleHideToTray}
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="Ocultar en la bandeja del sistema"
        title="Ocultar en la bandeja del sistema"
      >
        &minus;
      </button>

      <GlucoseDisplay reading={reading} />

      <ResizeHandle />
    </div>
  );
}
