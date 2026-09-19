import { useEffect, useState, type FormEvent } from "react";
import { useDexcomStore } from "../stores/useDexcomStore";
import type { DexcomRegion } from "../types/dexcom";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string } | { kind: "success" };

export function DexcomSettingsPanel() {
  const { username: savedUsername, region: savedRegion, enabled, isLoaded, loadSettings, connect, disconnect } =
    useDexcomStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState<DexcomRegion>("us");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (isLoaded) {
      setUsername(savedUsername);
      setRegion(savedRegion);
    }
  }, [isLoaded, savedUsername, savedRegion]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ kind: "saving" });
    try {
      await connect(username, password, region);
      setPassword("");
      setStatus({ kind: "success" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleDisconnect = async () => {
    setStatus({ kind: "saving" });
    try {
      await disconnect();
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="settings-panel">
      <h1 className="settings-panel__title">Conectar con Dexcom Share</h1>
      <p className="settings-panel__hint">
        Usa las mismas credenciales que en la app "Dexcom Share" del móvil (no las de tu app Dexcom G6/G7
        principal). La contraseña se guarda en el almacén seguro del sistema, nunca en la base de datos de la app.
      </p>

      <form className="settings-panel__form" onSubmit={handleSubmit}>
        <label className="settings-panel__field">
          Usuario
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="settings-panel__field">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <label className="settings-panel__field">
          Región
          <select value={region} onChange={(event) => setRegion(event.target.value as DexcomRegion)}>
            <option value="us">Estados Unidos</option>
            <option value="ous">Fuera de Estados Unidos</option>
          </select>
        </label>

        <button type="submit" className="settings-panel__submit" disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Comprobando…" : "Guardar y conectar"}
        </button>

        {status.kind === "error" && <p className="settings-panel__message settings-panel__message--error">{status.message}</p>}
        {status.kind === "success" && (
          <p className="settings-panel__message settings-panel__message--success">
            Conectado. El widget ya mostrará tus lecturas reales.
          </p>
        )}
      </form>

      {enabled && (
        <button type="button" className="settings-panel__disconnect" onClick={handleDisconnect}>
          Desconectar y volver a datos simulados
        </button>
      )}
    </div>
  );
}
