import { create } from "zustand";
import { fetchUserSettings, saveTargetRange, saveWidgetGeometry } from "../lib/db";
import type { TargetRange, WidgetGeometry } from "../types/settings";

const DEFAULT_GEOMETRY: WidgetGeometry = { x: 100, y: 100, width: 220, height: 140 };
const DEFAULT_TARGET_RANGE: TargetRange = { min: 70, max: 180 };

interface SettingsState {
  geometry: WidgetGeometry;
  targetRange: TargetRange;
  isLoaded: boolean;
  loadError: string | null;
  loadSettings: () => Promise<void>;
  updateGeometry: (geometry: WidgetGeometry) => Promise<void>;
  updateTargetRange: (range: TargetRange) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  geometry: DEFAULT_GEOMETRY,
  targetRange: DEFAULT_TARGET_RANGE,
  isLoaded: false,
  loadError: null,

  loadSettings: async () => {
    try {
      const row = await fetchUserSettings();
      set({
        geometry: {
          x: row.widget_x,
          y: row.widget_y,
          width: row.widget_width,
          height: row.widget_height,
        },
        targetRange: { min: row.target_range_min, max: row.target_range_max },
        isLoaded: true,
        loadError: null,
      });
    } catch (error) {
      set({
        isLoaded: true,
        loadError: error instanceof Error ? error.message : "Error desconocido al cargar la configuración",
      });
    }
  },

  // Optimista: refleja el cambio en memoria de inmediato (la UI/ventana ya
  // se movió) y persiste en segundo plano; un fallo al persistir no debe
  // congelar la interacción del usuario, solo se registra en consola.
  updateGeometry: async (geometry) => {
    set({ geometry });
    try {
      await saveWidgetGeometry(geometry);
    } catch (error) {
      console.error(error);
    }
  },

  updateTargetRange: async (range) => {
    const previous = get().targetRange;
    set({ targetRange: range });
    try {
      await saveTargetRange(range.min, range.max);
    } catch (error) {
      console.error(error);
      set({ targetRange: previous });
    }
  },
}));
