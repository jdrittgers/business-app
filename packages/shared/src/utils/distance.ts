export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 - First coordinate (lat, lng)
 * @param coord2 - Second coordinate (lat, lng)
 * @returns Distance in miles
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 3958.8; // Earth's radius in miles (use 6371 for kilometers)

  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLngRad = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param miles - Distance in miles
 * @returns Formatted string (e.g., "12.5 miles", "215 miles")
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return 'less than 0.1 miles';
  if (miles < 1) return `${miles.toFixed(1)} miles`;
  if (miles >= 100) return `${Math.round(miles)} miles`;
  return `${miles.toFixed(1)} miles`;
}

/**
 * Check if a coordinate is within a given radius
 * @param center - Center coordinate
 * @param target - Target coordinate to check
 * @param radiusMiles - Radius in miles
 * @returns true if target is within radius
 */
export function isWithinRadius(
  center: Coordinates,
  target: Coordinates,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(center, target);
  return distance <= radiusMiles;
}
