export type DexcomRegion = "us" | "ous";

export interface DexcomSettings {
  username: string;
  region: DexcomRegion;
  enabled: boolean;
}
