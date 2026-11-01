// LivingGlobe — Type contracts and data schemas

export type GlobeTab = 'living-globe' | 'day-night';

export interface City {
  id: 'dhaka' | 'helsinki';
  name: string;
  lat: number;
  lon: number;
  timeZone: 'Asia/Dhaka' | 'Europe/Helsinki';
  label: string;
}

// Validation helpers
export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isGlobeTab(value: string): value is GlobeTab {
  return value === 'living-globe' || value === 'day-night';
}

export const DEFAULT_TAB: GlobeTab = 'living-globe';
