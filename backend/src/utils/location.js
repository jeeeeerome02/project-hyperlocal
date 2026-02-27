/**
 * Location fuzzing utility.
 * Applies irreversible random displacement to coordinates based on configured fuzzing radius.
 * The original coordinates are NEVER stored — only the fuzzed result persists.
 */

/**
 * Fuzz a GPS coordinate by a random distance within [minRadius, maxRadius] meters
 * in a random direction. Uses the Haversine inverse formula.
 *
 * @param {number} lat - Original latitude
 * @param {number} lng - Original longitude
 * @param {number} minRadiusMeters - Minimum fuzzing distance in meters
 * @param {number} maxRadiusMeters - Maximum fuzzing distance in meters
 * @returns {{ lat: number, lng: number, fuzzRadiusUsed: number }}
 */
export function fuzzLocation(lat, lng, minRadiusMeters, maxRadiusMeters) {
  // For exact locations (e.g., barangay announcements), skip fuzzing
  if (maxRadiusMeters === 0) {
    return { lat, lng, fuzzRadiusUsed: 0 };
  }

  // Generate random displacement distance within the fuzzing range
  const radiusRange = maxRadiusMeters - minRadiusMeters;
  const randomRadius = minRadiusMeters + Math.random() * radiusRange;

  // Generate random bearing (0-360 degrees)
  const randomBearing = Math.random() * 360;

  // Convert to radians
  const lat1 = lat * (Math.PI / 180);
  const lng1 = lng * (Math.PI / 180);
  const bearingRad = randomBearing * (Math.PI / 180);

  // Earth radius in meters
  const R = 6371000;

  // Angular distance
  const angularDistance = randomRadius / R;

  // Calculate new position using Haversine inverse
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: lat2 * (180 / Math.PI),
    lng: lng2 * (180 / Math.PI),
    fuzzRadiusUsed: Math.round(randomRadius),
  };
}

/**
 * Validate that coordinates are within valid ranges.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

/**
 * Calculate the Haversine distance between two points in meters.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
