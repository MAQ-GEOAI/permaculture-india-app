# sun.py – Accurate solar path computation
from datetime import datetime, timedelta
import math

# Try to import pysolar, but provide fallback if not available
try:
    from pysolar.solar import get_altitude, get_azimuth
    PYSOLAR_AVAILABLE = True
except ImportError:
    PYSOLAR_AVAILABLE = False
    print("[SUN] Warning: pysolar not available, using simplified calculation")

def calculate_sun_position_simple(lat, lon, dt):
    """Simplified sun position calculation (fallback when pysolar not available)"""
    # Day of year
    day_of_year = dt.timetuple().tm_yday
    
    # Solar declination (approximate)
    declination = 23.45 * math.sin(math.radians(360 * (284 + day_of_year) / 365))
    
    # Hour angle
    hour = dt.hour + dt.minute / 60.0
    hour_angle = 15 * (hour - 12)
    
    # Convert to radians
    lat_rad = math.radians(lat)
    decl_rad = math.radians(declination)
    hour_rad = math.radians(hour_angle)
    
    # Altitude
    altitude = math.asin(
        math.sin(lat_rad) * math.sin(decl_rad) +
        math.cos(lat_rad) * math.cos(decl_rad) * math.cos(hour_rad)
    )
    altitude_deg = math.degrees(altitude)
    
    # Azimuth
    azimuth = math.atan2(
        math.sin(hour_rad),
        math.cos(hour_rad) * math.sin(lat_rad) - math.tan(decl_rad) * math.cos(lat_rad)
    )
    azimuth_deg = math.degrees(azimuth)
    if azimuth_deg < 0:
        azimuth_deg += 360
    
    return altitude_deg, azimuth_deg

def sun_path(lat, lon, date="2025-01-01"):
    """
    Generate sun path for given location and date
    
    Args:
        lat: Latitude
        lon: Longitude
        date: Date string in ISO format (YYYY-MM-DD)
    
    Returns:
        Dictionary with sun path data
    """
    try:
        # Parse date
        if isinstance(date, str):
            date_obj = datetime.fromisoformat(date)
        else:
            date_obj = date
        
        result = []
        
        # Calculate sun position for each hour (6 AM to 6 PM)
        for hour in range(6, 19):
            try:
                dt = date_obj.replace(hour=hour, minute=0, second=0, microsecond=0)
                
                if PYSOLAR_AVAILABLE:
                    try:
                        alt = get_altitude(lat, lon, dt)
                        azi = get_azimuth(lat, lon, dt)
                    except Exception as e:
                        # Fallback to simple calculation if pysolar fails
                        alt, azi = calculate_sun_position_simple(lat, lon, dt)
                else:
                    alt, azi = calculate_sun_position_simple(lat, lon, dt)
                
                result.append({
                    "hour": hour,
                    "altitude": round(float(alt), 2),
                    "azimuth": round(float(azi), 2)
                })
            except Exception as e:
                print(f"[SUN] Error calculating hour {hour}: {e}")
                # Continue with other hours
                continue
        
        return {
            "lat": float(lat),
            "lon": float(lon),
            "date": date if isinstance(date, str) else date_obj.isoformat(),
            "sun_path": result
        }
    except Exception as e:
        print(f"[SUN] Error in sun_path: {e}")
        # Return minimal valid response
        return {
            "lat": float(lat),
            "lon": float(lon),
            "date": date if isinstance(date, str) else "2025-01-01",
            "sun_path": [],
            "error": str(e)
        }
