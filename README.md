# CGM Flotante

Widget flotante para Windows que muestra tu glucosa de **Dexcom Share** casi en tiempo real. Hecho con Tauri 2 (Rust) + React + TypeScript.

> **Aviso importante:** este proyecto es un experimento personal, **no es un producto sanitario** ni está afiliado a Dexcom. No lo uses para tomar decisiones de tratamiento (dosis de insulina, etc.). Usa siempre la app y el dispositivo oficiales. Ver [Limitaciones](#limitaciones).

## Qué hace

- Ventana flotante sin bordes y siempre encima, que se arrastra y se redimensiona desde la esquina.
- Muestra el valor en mg/dL, la flecha de tendencia y la hora de la última lectura. El fondo cambia de color según estés dentro o fuera del rango objetivo (por defecto 70–180 mg/dL).
- Botón "−" para ocultarla a la bandeja del sistema; clic izquierdo en el icono de la bandeja la muestra u oculta, y el menú del clic derecho tiene "Configuración de Dexcom…" y "Salir".
- El propio icono de la bandeja muestra el número actual (verde en rango, rojo fuera de rango), para verlo sin abrir el widget.
- Recuerda posición y tamaño entre reinicios (SQLite local).
- Si no hay cuenta conectada, muestra datos simulados.

## Cómo protege tus credenciales

- La **contraseña** de Dexcom Share se guarda en el Administrador de Credenciales de Windows, nunca en la base de datos ni en ficheros.
- Solo se envía por HTTPS a los servidores de Dexcom (`share2.dexcom.com` o `shareous1.dexcom.com`).
- El **usuario** y la región sí se guardan en la base SQLite local (`%APPDATA%\com.cgmflotante.app\cgm_float.db`).

## Requisitos para compilarlo

- Windows 10/11 (con WebView2, que ya viene en Windows 11).
- [Node.js](https://nodejs.org/) (LTS).
- [Rust](https://rustup.rs/) (`winget install Rustlang.Rustup`).
- Visual Studio Build Tools con la carga de trabajo "Desarrollo de escritorio con C++". En un equipo Windows on ARM añade también el componente "MSVC ARM64 build tools".

Se ha desarrollado y probado en **Windows on ARM64**. En x64 debería funcionar igual, pero no se ha probado.

## Uso

```bash
npm install
npm run tauri dev      # modo desarrollo
npm run tauri build    # genera los instaladores
```

Los instaladores quedan en `src-tauri/target/release/bundle/` (`msi/` y `nsis/`). No están firmados, así que Windows SmartScreen mostrará un aviso al instalarlos ("Más información" → "Ejecutar de todas formas").

### Conectar tu cuenta de Dexcom

1. En la app móvil de Dexcom, activa **Dexcom Share**. Según los clientes no oficiales del protocolo, normalmente hace falta tener al menos un seguidor para que se publiquen lecturas.
2. En CGM Flotante: clic derecho en el icono de la bandeja → **Configuración de Dexcom…**.
3. Introduce el usuario y la contraseña de esa cuenta y elige la región (Estados Unidos o fuera de Estados Unidos).
4. Pulsa **Guardar y conectar**. Se comprueba la conexión antes de activarla.

## Estructura

- `src/`: interfaz (React, Zustand). `components/`, `hooks/`, `stores/`, `lib/`.
- `src-tauri/src/`: backend en Rust.
  - `dexcom.rs`: cliente del protocolo Dexcom Share.
  - `credentials.rs`: contraseña en el almacén de Windows.
  - `tray.rs`, `tray_icon.rs`, `window.rs`: bandeja, icono dinámico y ventanas.
  - `storage/`: migraciones SQLite.

## Limitaciones

- Usa el protocolo **no oficial y no documentado** de Dexcom Share, descubierto por la comunidad. Dexcom puede cambiarlo o bloquearlo en cualquier momento, y su uso puede no estar permitido por sus términos de servicio: revísalos antes de usarlo.
- Dexcom Share solo actualiza cada ~5 minutos. La app consulta cada 60 s.
- El rango objetivo (70–180) se guarda en la tabla `user_settings`, pero todavía no hay pantalla para cambiarlo.
- No hay alarmas ni avisos sonoros.

## Licencia

[MIT](LICENSE)
