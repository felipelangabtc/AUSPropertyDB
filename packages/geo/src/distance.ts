import { getDistance, getPreciseDistance } from 'geolib';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  distance_meters: number;
  distance_km: number;
  distance_miles: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters, km, and miles
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  precise = false
): DistanceResult {
  const distanceM = precise ? getPreciseDistance(point1, point2) : getDistance(point1, point2);

  return {
    distance_meters: distanceM,
    distance_km: distanceM / 1000,
    distance_miles: distanceM / 1609.34,
  };
}

/**
 * Check if a point is within a radius
 */
export function isPointWithinRadius(
  centerPoint: Coordinates,
  targetPoint: Coordinates,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(centerPoint, targetPoint);
  return distance.distance_meters <= radiusMeters;
}

/**
 * Find all points within a radius
 */
export function filterPointsByRadius(
  centerPoint: Coordinates,
  points: Coordinates[],
  radiusMeters: number
): Coordinates[] {
  return points.filter((point) => isPointWithinRadius(centerPoint, point, radiusMeters));
}

/**
 * Sort points by distance from center
 */
export function sortByDistance(
  centerPoint: Coordinates,
  points: Coordinates[]
): Array<{
  point: Coordinates;
  distance: DistanceResult;
}> {
  return points
    .map((point) => ({
      point,
      distance: calculateDistance(centerPoint, point),
    }))
    .sort((a, b) => a.distance.distance_meters - b.distance.distance_meters);
}

/**
 * Calculate center point (centroid) of multiple coordinates
 */
export function calculateCentroid(points: Coordinates[]): Coordinates {
  if (points.length === 0) throw new Error('No points provided');

  const sum = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: sum.latitude / points.length,
    longitude: sum.longitude / points.length,
  };
}

/**
 * Calculate bounds (bounding box) for multiple coordinates
 */
export function calculateBounds(points: Coordinates[]): {
  ne: Coordinates; // Northeast
  sw: Coordinates; // Southwest
} {
  if (points.length === 0) throw new Error('No points provided');

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);

  return {
    ne: {
      latitude: Math.max(...lats),
      longitude: Math.max(...lngs),
    },
    sw: {
      latitude: Math.min(...lats),
      longitude: Math.min(...lngs),
    },
  };
}
