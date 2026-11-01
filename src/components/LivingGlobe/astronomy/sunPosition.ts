// LivingGlobe — Astronomical calculations
// Implements simplified solar position algorithm based on Jean Meeus,
// "Astronomical Algorithms", 2nd edition, 1998.
//
// Accuracy: ~0.01° for solar position, sufficient for day/night visualization.
// Does not account for atmospheric refraction at the observer's horizon.

/**
 * Calculate the Sun's direction vector in Earth-centered inertial coordinates.
 *
 * The algorithm computes:
 * 1. Julian centuries from J2000.0 epoch
 * 2. Mean anomaly and mean longitude of the Sun
 * 3. Equation of center (orbital eccentricity correction)
 * 4. True longitude and declination
 * 5. Greenwich Mean Sidereal Time (GMST)
 * 6. Sun direction in Earth-fixed coordinates
 *
 * @param date - The UTC date/time for calculation
 * @returns Unit vector pointing toward the Sun in Earth-fixed frame
 */
export function sunDirection(date: Date): { x: number; y: number; z: number } {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const days = (date.getTime() - J2000) / (86400000);
  const T = days / 36525; // Julian centuries from J2000.0

  // Mean anomaly of the Sun (degrees)
  const M = ((357.5291 + 35999.0503 * T) % 360 + 360) % 360;
  const Mrad = (M * Math.PI) / 180;

  // Mean longitude of the Sun (degrees)
  const L0 = ((280.4665 + 36000.7693 * T) % 360 + 360) % 360;

  // Equation of center (degrees → radians)
  const C =
    (1.9148 * Math.sin(Mrad) +
      0.0199 * Math.sin(2 * Mrad) +
      0.0003 * Math.sin(3 * Mrad));

  // True longitude of the Sun (degrees)
  const sunTrueLon = L0 + C;
  const sunTrueLonRad = (sunTrueLon * Math.PI) / 180;

  // Obliquity of the ecliptic (degrees)
  const epsilon = 23.4393 - 0.0000004 * T;
  const epsilonRad = (epsilon * Math.PI) / 180;

  // Solar declination
  const sinDecl = Math.sin(epsilonRad) * Math.sin(sunTrueLonRad);
  const decl = Math.asin(sinDecl);

  // Right ascension
  const ra = Math.atan2(
    Math.cos(epsilonRad) * Math.sin(sunTrueLonRad),
    Math.cos(sunTrueLonRad)
  );

  // Greenwich Mean Sidereal Time (degrees)
  const gmstDeg = ((280.46061837 + 360.98564736629 * days) % 360 + 360) % 360;
  const gmst = (gmstDeg * Math.PI) / 180;

  // Greenwich Hour Angle of the Sun
  const gha = gmst - ra;

  // Convert to Earth-fixed direction vector
  // In our coordinate system:
  //   x = toward Greenwich meridian at equator
  //   y = toward North Pole
  //   z = completes right-handed system
  return {
    x: Math.cos(decl) * Math.cos(gha),
    y: Math.sin(decl),
    z: Math.cos(decl) * Math.sin(gha),
  };
}

/**
 * Calculate the solar declination angle for a given date.
 * Used for verification and display purposes.
 *
 * @param date - The UTC date/time
 * @returns Declination angle in degrees (positive = northern hemisphere summer)
 */
export function solarDeclination(date: Date): number {
  const dir = sunDirection(date);
  return Math.asin(dir.y) * (180 / Math.PI);
}

/**
 * Format a date as local time in a specific IANA time zone.
 * Uses browser-native Intl.DateTimeFormat — no external library needed.
 *
 * @param date - The date to format
 * @param timeZone - IANA time zone identifier
 * @returns Formatted time string (HH:MM:SS, 24-hour)
 */
export function formatLocalTime(
  date: Date,
  timeZone: 'Asia/Dhaka' | 'Europe/Helsinki'
): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Format a date as short local time (HH:MM) in a specific IANA time zone.
 */
export function formatShortTime(
  date: Date,
  timeZone: 'Asia/Dhaka' | 'Europe/Helsinki'
): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Determine whether a location is in daylight at a given time.
 *
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @param date - The UTC date/time
 * @returns 'day', 'night', or 'twilight'
 */
export function dayNightStatus(
  lat: number,
  lon: number,
  date: Date
): 'day' | 'night' | 'twilight' {
  const sunDir = sunDirection(date);

  // Convert lat/lon to Earth-fixed unit vector
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const localX = Math.cos(latRad) * Math.cos(lonRad);
  const localY = Math.sin(latRad);
  const localZ = -Math.cos(latRad) * Math.sin(lonRad);

  // Match the Earth-fixed axes used by sunDirection and the globe renderer.
  const dot = localX * sunDir.x + localY * sunDir.y + localZ * sunDir.z;

  if (dot > 0.1) return 'day';
  if (dot < -0.1) return 'night';
  return 'twilight';
}

/**
 * Calculate the Moon phase for a given date.
 * Uses the synodic month (~29.53 days) to determine phase fraction and name.
 * This is a simplified calculation — not precision ephemeris data.
 *
 * @param date - The UTC date/time
 * @returns Phase name, fraction (0=new, 0.5=full), and illumination percentage
 */
export function moonPhase(date: Date): {
  name: string;
  fraction: number;
  illumination: number;
} {
  // Synodic month length in days
  const synodicMonth = 29.53058867;
  
  // Known new moon: January 6, 2000 at 18:14 UTC
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSince = (date.getTime() - knownNewMoon) / 86400000;
  
  // Fraction of current synodic month (0 = new, 0.5 = full)
  const fraction = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth / synodicMonth;
  
  // Illumination: 100% at full (0.5), 0% at new (0)
  const illumination = Math.round((0.5 - Math.abs(fraction - 0.5)) * 2 * 100);
  
  // Phase name based on fraction
  let name: string;
  if (fraction < 0.03 || fraction > 0.97) {
    name = 'New Moon';
  } else if (fraction < 0.22) {
    name = 'Waxing Crescent';
  } else if (fraction < 0.28) {
    name = 'First Quarter';
  } else if (fraction < 0.47) {
    name = 'Waxing Gibbous';
  } else if (fraction < 0.53) {
    name = 'Full Moon';
  } else if (fraction < 0.72) {
    name = 'Waning Gibbous';
  } else if (fraction < 0.78) {
    name = 'Last Quarter';
  } else {
    name = 'Waning Crescent';
  }
  
  return { name, fraction, illumination };
}
