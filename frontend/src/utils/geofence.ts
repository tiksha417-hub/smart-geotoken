import type { Coordinates } from '../types';

/**
 * Calculates distance between two GPS coordinates using the Haversine formula
 * Returns distance in meters
 */
export function calculateHaversineDistance(pointA: Coordinates, pointB: Coordinates): number {
  const earthRadius = 6371e3; // Earth radius in meters
  const lat1Rad = (pointA.lat * Math.PI) / 180;
  const lat2Rad = (pointB.lat * Math.PI) / 180;
  const deltaLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const deltaLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadius * c);
}

/**
 * Format meter distance to human readable format (e.g. 85 m, 1.4 km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export type GeofenceZone = 'INSIDE' | 'GRACE_ZONE' | 'OUTSIDE';

export interface GeofenceEvaluation {
  zone: GeofenceZone;
  isWithin: boolean;
  distanceMeters: number;
  radiusMeters: number;
  distanceToBoundaryMeters: number; // positive if outside, negative if inside
  percentageOfRadius: number;
  message: string;
}

/**
 * Evaluates whether coordinates are inside the geofence perimeter
 */
export function evaluateGeofence(
  userCoords: Coordinates,
  branchCoords: Coordinates,
  radiusMeters: number
): GeofenceEvaluation {
  const distance = calculateHaversineDistance(userCoords, branchCoords);
  const diff = distance - radiusMeters;
  const percentage = (distance / radiusMeters) * 100;

  if (distance <= radiusMeters) {
    return {
      zone: 'INSIDE',
      isWithin: true,
      distanceMeters: distance,
      radiusMeters,
      distanceToBoundaryMeters: diff,
      percentageOfRadius: percentage,
      message: `You are inside the service perimeter (${formatDistance(distance)} from center). Token generation authorized.`,
    };
  }

  // Grace zone: within 1.25x of radius
  if (distance <= radiusMeters * 1.25) {
    return {
      zone: 'GRACE_ZONE',
      isWithin: false,
      distanceMeters: distance,
      radiusMeters,
      distanceToBoundaryMeters: diff,
      percentageOfRadius: percentage,
      message: `You are near the perimeter boundary (${formatDistance(diff)} away). Please step closer into the branch area.`,
    };
  }

  return {
    zone: 'OUTSIDE',
    isWithin: false,
    distanceMeters: distance,
    radiusMeters,
    distanceToBoundaryMeters: diff,
    percentageOfRadius: percentage,
    message: `You are outside the branch geofence (${formatDistance(distance)} away). You must be within ${formatDistance(radiusMeters)} to generate a token.`,
  };
}

/**
 * Generates an offset point at a specific distance (meters) and bearing (degrees)
 */
export function getOffsetCoordinates(
  center: Coordinates,
  distanceMeters: number,
  bearingDegrees: number = 45
): Coordinates {
  const earthRadius = 6371e3;
  const bearingRad = (bearingDegrees * Math.PI) / 180;
  const lat1Rad = (center.lat * Math.PI) / 180;
  const lng1Rad = (center.lng * Math.PI) / 180;

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(distanceMeters / earthRadius) +
    Math.cos(lat1Rad) * Math.sin(distanceMeters / earthRadius) * Math.cos(bearingRad)
  );

  const lng2Rad =
    lng1Rad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceMeters / earthRadius) * Math.cos(lat1Rad),
      Math.cos(distanceMeters / earthRadius) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

  return {
    lat: Number(((lat2Rad * 180) / Math.PI).toFixed(6)),
    lng: Number(((lng2Rad * 180) / Math.PI).toFixed(6)),
  };
}

/**
 * Creates a verification hash for audit and anti-spoofing verification
 */
export function createGeofenceHash(coords: Coordinates, branchId: string, timestamp: string): string {
  const raw = `${branchId}:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}:${timestamp}:SECURE_GEO_V1`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `GEO-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}
