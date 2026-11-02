import type { MatKey } from './buildCar';

export interface MatDef {
  color: string;
  metalness: number;
  roughness: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export const MATERIALS: Record<MatKey, MatDef> = {
  paint: { color: '#9b1c22', metalness: 0.55, roughness: 0.32 },
  glass: { color: '#7fa3c4', metalness: 0.35, roughness: 0.04, opacity: 0.4 },
  trim: { color: '#1a1c20', metalness: 0.2, roughness: 0.65 },
  rubber: { color: '#17181a', metalness: 0, roughness: 0.92 },
  alu: { color: '#b7bcc3', metalness: 0.75, roughness: 0.32 },
  steel: { color: '#868c94', metalness: 0.7, roughness: 0.42 },
  darkmetal: { color: '#3b4048', metalness: 0.55, roughness: 0.5 },
  chrome: { color: '#dfe3e8', metalness: 1, roughness: 0.12 },
  copper: { color: '#c47a3a', metalness: 0.85, roughness: 0.3 },
  hv: { color: '#ff7a00', metalness: 0.1, roughness: 0.5, emissive: '#ff5a00', emissiveIntensity: 0.15 },
  cell: { color: '#2f63a8', metalness: 0.35, roughness: 0.45 },
  headlight: { color: '#f4f8ff', metalness: 0.1, roughness: 0.1, emissive: '#d6e8ff', emissiveIntensity: 0.9 },
  taillight: { color: '#b3121c', metalness: 0.1, roughness: 0.2, emissive: '#ff1f2e', emissiveIntensity: 0.7 },
  fabric: { color: '#2c2f35', metalness: 0, roughness: 0.95 },
  dash: { color: '#23262b', metalness: 0.1, roughness: 0.75 },
  screen: { color: '#0b1018', metalness: 0.2, roughness: 0.15, emissive: '#2b6fe0', emissiveIntensity: 0.22 },
  exhaust: { color: '#8f8579', metalness: 0.6, roughness: 0.5 },
  radiator: { color: '#4a5058', metalness: 0.6, roughness: 0.55 },
  magnet: { color: '#b8323a', metalness: 0.5, roughness: 0.4 },
  coolant: { color: '#3d7fd6', metalness: 0.4, roughness: 0.4 },
  reservoir: { color: '#e9e4d8', metalness: 0, roughness: 0.35, opacity: 0.78 },
  capYellow: { color: '#f2c230', metalness: 0.05, roughness: 0.45 },
  capBlue: { color: '#2f6fd6', metalness: 0.05, roughness: 0.45 },
};
