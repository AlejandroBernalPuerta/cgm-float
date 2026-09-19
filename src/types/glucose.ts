export type GlucoseTrend = "rising_fast" | "rising" | "flat" | "falling" | "falling_fast" | "unknown";

export interface GlucoseReading {
  /** Valor de glucosa en mg/dL */
  value: number;
  trend: GlucoseTrend;
  timestamp: Date;
}
