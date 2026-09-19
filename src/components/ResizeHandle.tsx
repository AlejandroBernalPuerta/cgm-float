import { useWindowResize } from "../hooks/useWindowResize";

/**
 * Handle visual en la esquina inferior derecha del widget. El
 * `stopPropagation` real ocurre dentro de `onResizeHandleMouseDown`
 * (hook), no aquí, porque también debe evitar que React vuelva a disparar
 * el listener de arrastre del contenedor padre.
 */
export function ResizeHandle() {
  const { onResizeHandleMouseDown } = useWindowResize();

  return (
    <div
      className="resize-handle"
      onMouseDown={onResizeHandleMouseDown}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Redimensionar widget"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M14 14 L14 9 M14 14 L9 14 M14 14 L14 2 M14 14 L2 14"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </div>
  );
}
