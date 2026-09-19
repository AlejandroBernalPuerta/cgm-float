import { create } from "zustand";
import type { GlucoseReading } from "../types/glucose";

interface GlucoseState {
  reading: GlucoseReading | null;
  setReading: (reading: GlucoseReading) => void;
}

export const useGlucoseStore = create<GlucoseState>((set) => ({
  reading: null,
  setReading: (reading) => set({ reading }),
}));
