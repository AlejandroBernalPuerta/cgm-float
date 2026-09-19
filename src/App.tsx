import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettingsPersistence } from "./hooks/useSettingsPersistence";
import { FloatingWidget } from "./components/FloatingWidget";
import { DexcomSettingsPanel } from "./components/DexcomSettingsPanel";
import "./styles/global.css";

const SETTINGS_WINDOW_LABEL = "settings";

// El mismo bundle sirve a ambas ventanas (declaradas en tauri.conf.json);
// se elige el árbol a montar por el label de la ventana actual en vez de
// duplicar el punto de entrada de Vite.
export default function App() {
  const isSettingsWindow = getCurrentWindow().label === SETTINGS_WINDOW_LABEL;
  return isSettingsWindow ? <SettingsWindowApp /> : <MainWidgetApp />;
}

function SettingsWindowApp() {
  return (
    <div className="settings-window">
      <DexcomSettingsPanel />
    </div>
  );
}

function MainWidgetApp() {
  const { isReady, loadError } = useSettingsPersistence();

  if (loadError) {
    return (
      <div className="app-status app-status--error" role="alert">
        Error al cargar la configuración: {loadError}
      </div>
    );
  }

  if (!isReady) {
    return <div className="app-status">Iniciando…</div>;
  }

  return <FloatingWidget />;
}
