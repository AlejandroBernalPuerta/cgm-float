export interface WidgetGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TargetRange {
  min: number;
  max: number;
}

export interface UserSettings {
  geometry: WidgetGeometry;
  targetRange: TargetRange;
}
