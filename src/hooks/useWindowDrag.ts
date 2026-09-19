import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Devuelve un manejador de `mousedown` que delega el arrastre a la API
 * nativa de ventanas de Tauri (`startDragging`). La persistencia de la
 * posición resultante no se hace aquí: la gestiona `useSettingsPersistence`
 * escuchando el evento nativo `onMoved`, que se dispara tanto al soltar el
 * arrastre como ante cualquier otro movimiento (p. ej. Aero Snap).
 */
export function useWindowDrag() {
  const onDragHandleMouseDown = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return; // solo botón izquierdo inicia el arrastre
    event.preventDefault();

    getCurrentWindow()
      .startDragging()
      .catch((error) => console.error("Error al iniciar el arrastre de la ventana:", error));
  }, []);

  return { onDragHandleMouseDown };
}
