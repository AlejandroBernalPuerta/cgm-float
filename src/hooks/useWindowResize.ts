import { useCallback, useRef } from "react";
import { currentMonitor, getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

export const MIN_WIDGET_WIDTH = 160;
export const MIN_WIDGET_HEIGHT = 100;
export const MAX_WIDGET_WIDTH = 480;
export const MAX_WIDGET_HEIGHT = 360;

interface ResizeDragState {
  startScreenX: number;
  startScreenY: number;
  startWidth: number;
  startHeight: number;
  scaleFactor: number;
  /** Límite superior de tamaño derivado del monitor actual, en px lógicos. */
  maxWidth: number;
  maxHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Redimensiona la ventana arrastrando el handle de la esquina inferior
 * derecha. Como la ventana no tiene bordes nativos (`decorations: false`),
 * el sistema operativo no ofrece resize por sí solo: el nuevo tamaño se
 * calcula a mano en cada `mousemove` a partir del delta de coordenadas de
 * pantalla, y se limita a [MIN, MAX] y al tamaño del monitor actual para
 * que el widget no quede inservible ni se salga de la pantalla visible.
 */
export function useWindowResize() {
  const dragStateRef = useRef<ResizeDragState | null>(null);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const state = dragStateRef.current;
    if (!state) return;

    const deltaX = (event.screenX - state.startScreenX) / state.scaleFactor;
    const deltaY = (event.screenY - state.startScreenY) / state.scaleFactor;

    const width = clamp(state.startWidth + deltaX, MIN_WIDGET_WIDTH, Math.min(MAX_WIDGET_WIDTH, state.maxWidth));
    const height = clamp(state.startHeight + deltaY, MIN_WIDGET_HEIGHT, Math.min(MAX_WIDGET_HEIGHT, state.maxHeight));

    getCurrentWindow()
      .setSize(new LogicalSize(width, height))
      .catch((error) => console.error("Error al redimensionar la ventana:", error));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const onResizeHandleMouseDown = useCallback(
    async (event: React.MouseEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation(); // evita que el mismo gesto también dispare el drag de la ventana

      try {
        const appWindow = getCurrentWindow();
        const [outerSize, scaleFactor, monitor] = await Promise.all([
          appWindow.outerSize(),
          appWindow.scaleFactor(),
          currentMonitor(),
        ]);

        const logicalSize = outerSize.toLogical(scaleFactor);
        const monitorLogicalSize = monitor ? monitor.size.toLogical(scaleFactor) : null;

        dragStateRef.current = {
          startScreenX: event.screenX,
          startScreenY: event.screenY,
          startWidth: logicalSize.width,
          startHeight: logicalSize.height,
          scaleFactor,
          maxWidth: monitorLogicalSize?.width ?? MAX_WIDGET_WIDTH,
          maxHeight: monitorLogicalSize?.height ?? MAX_WIDGET_HEIGHT,
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      } catch (error) {
        console.error("No se pudo iniciar el redimensionado de la ventana:", error);
      }
    },
    [handleMouseMove, handleMouseUp]
  );

  return { onResizeHandleMouseDown };
}
