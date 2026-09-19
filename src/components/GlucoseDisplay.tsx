import type { GlucoseReading, GlucoseTrend } from "../types/glucose";

const TREND_ARROWS: Record<GlucoseTrend, string> = {
  rising_fast: "⇈",
  rising: "↑",
  flat: "→",
  falling: "↓",
  falling_fast: "⇊",
  unknown: "?",
};

const TREND_LABELS: Record<GlucoseTrend, string> = {
  rising_fast: "subiendo rápido",
  rising: "subiendo",
  flat: "estable",
  falling: "bajando",
  falling_fast: "bajando rápido",
  unknown: "desconocida",
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface GlucoseDisplayProps {
  reading: GlucoseReading | null;
}

export function GlucoseDisplay({ reading }: GlucoseDisplayProps) {
  if (!reading) {
    return <div className="glucose-display glucose-display--loading">Cargando…</div>;
  }

  return (
    <div className="glucose-display">
      <div className="glucose-display__value-row">
        <span className="glucose-display__value">{reading.value}</span>
        <span className="glucose-display__trend" aria-label={`Tendencia: ${TREND_LABELS[reading.trend]}`}>
          {TREND_ARROWS[reading.trend]}
        </span>
      </div>
      <span className="glucose-display__unit">mg/dL</span>
      <span className="glucose-display__timestamp">Última actualización: {formatTime(reading.timestamp)}</span>
    </div>
  );
}
