import math
from typing import Dict, Any, Tuple


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Computes great-circle distance between two points on the Earth's surface
    using the Haversine formula. Returns distance in meters.
    """
    # Earth radius in meters
    EARTH_RADIUS = 6371000.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = EARTH_RADIUS * c
    return round(distance, 2)


def is_valid_coordinates(lat: float, lon: float) -> bool:
    """Validates that latitude and longitude fall within physical Earth bounds."""
    if lat is None or lon is None:
        return False
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return False
    if math.isnan(lat) or math.isnan(lon) or math.isinf(lat) or math.isinf(lon):
        return False
    return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0


def evaluate_server_geofence(
    user_lat: float,
    user_lon: float,
    facility_lat: float,
    facility_lon: float,
    radius_meters: float
) -> Dict[str, Any]:
    """
    Evaluates whether the user's reported GPS coordinates are inside the
    configured facility geofence perimeter.
    """
    if not is_valid_coordinates(user_lat, user_lon):
        return {
            "is_valid": False,
            "is_within": False,
            "status": "INVALID_COORDINATES",
            "distance_meters": None,
            "radius_meters": radius_meters,
            "message": "GPS coordinates supplied are invalid or out of range."
        }

    distance = calculate_haversine_distance(user_lat, user_lon, facility_lat, facility_lon)
    is_inside = distance <= radius_meters

    if is_inside:
        status = "INSIDE"
        message = f"Inside geofence perimeter ({distance:.1f}m from facility)."
    elif distance <= radius_meters * 1.25:
        status = "APPROACHING"
        message = f"Approaching perimeter ({distance:.1f}m away, {distance - radius_meters:.1f}m to boundary)."
    else:
        status = "OUTSIDE"
        message = f"Outside perimeter ({distance:.1f}m away, exceeds {radius_meters}m boundary)."

    return {
        "is_valid": True,
        "is_within": is_inside,
        "status": status,
        "distance_meters": distance,
        "radius_meters": radius_meters,
        "message": message
    }
