import { create } from "zustand";
import { fetchDexcomSettings, saveDexcomSettings } from "../lib/db";
import { clearDexcomCredentials, fetchDexcomReading, saveDexcomPassword } from "../lib/dexcom";
import type { DexcomRegion, DexcomSettings } from "../types/dexcom";

interface DexcomState extends DexcomSettings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  /** Guarda credenciales, prueba la conexión una vez y solo activa Dexcom si funciona. */
  connect: (username: string, password: string, region: DexcomRegion) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useDexcomStore = create<DexcomState>((set, get) => ({
  username: "",
  region: "us",
  enabled: false,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings = await fetchDexcomSettings();
      set({ ...settings, isLoaded: true });
    } catch (error) {
      console.error(error);
      set({ isLoaded: true });
    }
  },

  connect: async (username, password, region) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      throw new Error("Introduce tu usuario de Dexcom Share.");
    }
    if (!password) {
      throw new Error("Introduce tu contraseña de Dexcom Share.");
    }

    await saveDexcomPassword(trimmedUsername, password);
    // Se prueba inmediatamente: si las credenciales o la región son
    // incorrectas, queremos fallar aquí y no activar Dexcom a ciegas.
    await fetchDexcomReading(trimmedUsername, region);

    const settings: DexcomSettings = { username: trimmedUsername, region, enabled: true };
    await saveDexcomSettings(settings);
    set({ ...settings });
  },

  disconnect: async () => {
    const { username } = get();
    const settings: DexcomSettings = { username, region: get().region, enabled: false };
    await saveDexcomSettings(settings);
    if (username) {
      await clearDexcomCredentials(username);
    }
    set({ enabled: false });
  },
}));
