import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Config estándar del template Tauri + Vite: puerto fijo para que
// src-tauri/tauri.conf.json (devUrl) pueda apuntar a él, y se ignoran los
// cambios en src-tauri para que cargo no dispare recompilaciones del
// frontend en bucle.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
