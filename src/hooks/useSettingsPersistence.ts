import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { useSettingsStore } from "../stores/useSettingsStore";
import type { WidgetGeometry } from "../types/settings";

const PERSIST_DEBOUNCE_MS = 400;

interface SettingsPersistenceResult {
  isReady: boolean;
  loadError: string | null;
}

/**
 * Sincroniza la ventana nativa con la configuración persistida en SQLite:
 * 1. Al montar, carga `user_settings` y aplica la posición/tamaño guardados
 *    a la ventana real (la ventana ya existe con un tamaño por defecto
 *    definido en tauri.conf.json, aquí se ajusta al valor persistido).
 * 2. Se suscribe a los eventos nativos `onMoved`/`onResized` -que cubren
 *    tanto el arrastre/resize manual como cualquier ajuste hecho por el
 *    propio SO (p. ej. Aero Snap)- y persiste el nuevo estado con debounce
 *    para no escribir en disco en cada frame del arrastre.
 */
export function useSettingsPersistence(): SettingsPersistenceResult {
  const geometry = useSettingsStore((state) => state.geometry);
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const loadError = useSettingsStore((state) => state.loadError);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateGeometry = useSettingsStore((state) => state.updateGeometry);

  const [hasAppliedInitialGeometry, setHasAppliedInitialGeometry] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Paso 1: aplicar geometría guardada a la ventana real, una sola vez.
  useEffect(() => {
    if (!isLoaded || loadError || hasAppliedInitialGeometry) return;

    let isCancelled = false;
    (async () => {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.setPosition(new LogicalPosition(geometry.x, geometry.y));
        await appWindow.setSize(new LogicalSize(geometry.width, geometry.height));
      } catch (error) {
        console.error("No se pudo restaurar la posición/tamaño del widget:", error);
      } finally {
        if (!isCancelled) setHasAppliedInitialGeometry(true);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, loadError, geometry, hasAppliedInitialGeometry]);

  // Paso 2: escuchar cambios nativos y persistirlos con debounce.
  useEffect(() => {
    if (!hasAppliedInitialGeometry) return;

    const appWindow = getCurrentWindow();
    let unlistenMoved: (() => void) | undefined;
    let unlistenResized: (() => void) | undefined;
    let isUnmounted = false;

    const schedulePersist = () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        persistCurrentGeometry(appWindow, updateGeometry).catch((error) =>
          console.error("No se pudo persistir la geometría del widget:", error)
        );
      }, PERSIST_DEBOUNCE_MS);
    };

    (async () => {
      const moved = await appWindow.onMoved(schedulePersist);
      const resized = await appWindow.onResized(schedulePersist);
      if (isUnmounted) {
        moved();
        resized();
        return;
      }
      unlistenMoved = moved;
      unlistenResized = resized;
    })();

    return () => {
      isUnmounted = true;
      unlistenMoved?.();
      unlistenResized?.();
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [hasAppliedInitialGeometry, updateGeometry]);

  return { isReady: hasAppliedInitialGeometry && !loadError, loadError };
}

async function persistCurrentGeometry(
  appWindow: ReturnType<typeof getCurrentWindow>,
  updateGeometry: (geometry: WidgetGeometry) => Promise<void>
): Promise<void> {
  const [position, size, scaleFactor] = await Promise.all([
    appWindow.outerPosition(),
    appWindow.outerSize(),
    appWindow.scaleFactor(),
  ]);
  const logicalPosition = position.toLogical(scaleFactor);
  const logicalSize = size.toLogical(scaleFactor);

  await updateGeometry({
    x: Math.round(logicalPosition.x),
    y: Math.round(logicalPosition.y),
    width: Math.round(logicalSize.width),
    height: Math.round(logicalSize.height),
  });
}
