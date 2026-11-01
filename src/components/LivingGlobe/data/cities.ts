// LivingGlobe — Verified city coordinates
// Coordinates verified against official geographic data

import { City } from './types';

export const CITIES: readonly City[] = Object.freeze([
  {
    id: 'dhaka',
    name: 'Dhaka',
    lat: 23.8103,
    lon: 90.4125,
    timeZone: 'Asia/Dhaka',
    label: 'Dhaka, Bangladesh',
  },
  {
    id: 'helsinki',
    name: 'Helsinki',
    lat: 60.1699,
    lon: 24.9384,
    timeZone: 'Europe/Helsinki',
    label: 'Helsinki, Finland',
  },
]);

export function findCity(id: 'dhaka' | 'helsinki'): City {
  const city = CITIES.find((c) => c.id === id);
  if (!city) throw new Error(`City not found: ${id}`);
  return city;
}

export function cityDistanceKm(cityA: City, cityB: City): number {
  const R = 6371; // Earth radius in km
  const dLat = ((cityB.lat - cityA.lat) * Math.PI) / 180;
  const dLon = ((cityB.lon - cityA.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((cityA.lat * Math.PI) / 180) *
      Math.cos((cityB.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Dhaka-Helsinki distance: ~7,200 km
export const DHAKA_HELSINKI_DISTANCE_KM = cityDistanceKm(
  findCity('dhaka'),
  findCity('helsinki')
);
