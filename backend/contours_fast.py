# contours_fast.py – Fast contour generation using OpenElevation API
# SIMPLIFIED VERSION - Fast and reliable for production
import requests
import numpy as np
import json
import math
import time

# Optional scipy imports
try:
    from scipy.ndimage import gaussian_filter
    from scipy.interpolate import griddata
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("[CONTOURS_FAST] scipy not available, using basic interpolation")

def generate_contours_fast(bbox, interval=5, bold_interval=None):
    """
    Fast contour generation using OpenElevation API
    This is much faster than downloading DEM tiles - perfect for free tier backend
    
    Args:
        bbox: "minx,miny,maxx,maxy" bounding box string
        interval: Contour interval in meters
        bold_interval: Every Nth contour to make bold
    """
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    # SIMPLIFIED: Use fixed grid size for speed (adjust based on area)
    area_km2 = abs((maxx - minx) * (maxy - miny)) * 111 * 111  # Approximate km²
    
    # Use smaller grid for faster processing - limit to 200 points max
    if area_km2 > 50:  # Large area
        num_points = 15  # 15x15 = 225 points
    elif area_km2 > 10:  # Medium area
        num_points = 20  # 20x20 = 400 points
    else:  # Small area
        num_points = 25  # 25x25 = 625 points
    
    num_points_x = num_points
    num_points_y = num_points
    
    lons = np.linspace(minx, maxx, num_points_x)
    lats = np.linspace(miny, maxy, num_points_y)
    
    # Prepare locations for API
    locations = []
    for lat in lats:
        for lon in lons:
            locations.append({"latitude": float(lat), "longitude": float(lon)})
    
    print(f"[CONTOURS_FAST] Requesting {len(locations)} elevation points from OpenElevation API...")
    
    # Request elevations in batches
    elevation_grid = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
    batch_size = 100
    received_count = 0
    
    for i in range(0, len(locations), batch_size):
        batch = locations[i:i+batch_size]
        try:
            response = requests.post(
                "https://api.open-elevation.com/api/v1/lookup",
                json={"locations": batch},
                timeout=30
            )
            if response.status_code == 200:
                results = response.json().get('results', [])
                for idx, result in enumerate(results):
                    if i + idx < len(locations):
                        elev = result.get('elevation')
                        if elev is not None and elev != -32768:
                            # Calculate grid position
                            loc = locations[i + idx]
                            lat_idx = np.argmin(np.abs(lats - loc['latitude']))
                            lon_idx = np.argmin(np.abs(lons - loc['longitude']))
                            elevation_grid[lat_idx, lon_idx] = float(elev)
                            received_count += 1
        except Exception as e:
            print(f"[CONTOURS_FAST] Batch request failed: {e}")
            continue
    
    if received_count == 0:
        raise Exception("No elevation data received from API")
    
    print(f"[CONTOURS_FAST] Received {received_count}/{len(locations)} elevation points")
    
    # Fill NaN values with proper interpolation
    valid_mask = ~np.isnan(elevation_grid)
    if np.sum(valid_mask) < 10:
        raise Exception("Insufficient valid elevation data")
    
    # Use scipy interpolation if available for better accuracy
    if SCIPY_AVAILABLE and np.sum(np.isnan(elevation_grid)) > 0:
        # Create coordinate grids
        lon_grid, lat_grid = np.meshgrid(lons, lats)
        
        # Get valid points for interpolation
        valid_lons = lon_grid[valid_mask]
        valid_lats = lat_grid[valid_mask]
        valid_elevs = elevation_grid[valid_mask]
        
        # Interpolate missing values
        nan_mask = np.isnan(elevation_grid)
        nan_lons = lon_grid[nan_mask]
        nan_lats = lat_grid[nan_mask]
        
        if len(nan_lons) > 0:
            interpolated = griddata(
                (valid_lats, valid_lons),
                valid_elevs,
                (nan_lats, nan_lons),
                method='cubic',
                fill_value=np.nanmean(valid_elevs)
            )
            elevation_grid[nan_mask] = interpolated
    
    # Fill any remaining NaN with mean
    if np.any(np.isnan(elevation_grid)):
        mean_elev = np.nanmean(elevation_grid)
        elevation_grid[np.isnan(elevation_grid)] = mean_elev
    
    # Smooth the data slightly for better contours
    if SCIPY_AVAILABLE:
        try:
            elevation_grid = gaussian_filter(elevation_grid, sigma=0.5)
        except:
            pass
    
    # Calculate min/max for contour levels
    min_elev = np.nanmin(elevation_grid)
    max_elev = np.nanmax(elevation_grid)
    
    # Generate contour levels
    min_level = math.floor(min_elev / interval) * interval
    max_level = math.ceil(max_elev / interval) * interval
    levels = np.arange(min_level, max_level + interval, interval)
    
    print(f"[CONTOURS_FAST] Generating contours at {len(levels)} levels (elevation range: {min_elev:.1f}m - {max_elev:.1f}m)")
    
    # SIMPLIFIED CONTOUR GENERATION - Fast and reliable
    print(f"[CONTOURS_FAST] Generating contours using marching squares algorithm...")
    start_contour = time.time()
    
    features = []
    min_elev_used = float(min_elev)
    max_elev_used = float(max_elev)
    
    # Use marching squares algorithm (simple and fast)
    for level in levels:
        if level < min_elev or level > max_elev:
            continue
        
        # Find contour points using marching squares
        contour_segments = []
        
        for i in range(len(lats) - 1):
            for j in range(len(lons) - 1):
                # Get cell corners
                z00 = elevation_grid[i, j]
                z01 = elevation_grid[i, j+1]
                z10 = elevation_grid[i+1, j]
                z11 = elevation_grid[i+1, j+1]
                
                # Skip if any corner is NaN
                if np.isnan(z00) or np.isnan(z01) or np.isnan(z10) or np.isnan(z11):
                    continue
                
                # Check if contour crosses this cell
                if not (min(z00, z01, z10, z11) <= level <= max(z00, z01, z10, z11)):
                    continue
                
                # Cell coordinates
                lat0, lat1 = float(lats[i]), float(lats[i+1])
                lon0, lon1 = float(lons[j]), float(lons[j+1])
                
                # Interpolate crossing points on edges
                points = []
                
                # Top edge
                if (z00 <= level <= z01) or (z01 <= level <= z00):
                    if abs(z01 - z00) > 0.01:
                        t = (level - z00) / (z01 - z00)
                        points.append([lon0 + t * (lon1 - lon0), lat0, float(level)])
                
                # Right edge
                if (z01 <= level <= z11) or (z11 <= level <= z01):
                    if abs(z11 - z01) > 0.01:
                        t = (level - z01) / (z11 - z01)
                        points.append([lon1, lat0 + t * (lat1 - lat0), float(level)])
                
                # Bottom edge
                if (z10 <= level <= z11) or (z11 <= level <= z10):
                    if abs(z11 - z10) > 0.01:
                        t = (level - z10) / (z11 - z10)
                        points.append([lon0 + t * (lon1 - lon0), lat1, float(level)])
                
                # Left edge
                if (z00 <= level <= z10) or (z10 <= level <= z00):
                    if abs(z10 - z00) > 0.01:
                        t = (level - z00) / (z10 - z00)
                        points.append([lon0, lat0 + t * (lat1 - lat0), float(level)])
                
                # Add segment if we have 2 points
                if len(points) >= 2:
                    contour_segments.append(points[0])
                    contour_segments.append(points[1])
        
        if len(contour_segments) < 3:
            continue
        
        # Group segments into continuous lines
        lines = []
        used = set()
        
        for start_idx in range(len(contour_segments)):
            if start_idx in used:
                continue
            
            line = [contour_segments[start_idx]]
            used.add(start_idx)
            current = contour_segments[start_idx]
            
            # Connect nearest points
            while True:
                nearest_idx = None
                nearest_dist = float('inf')
                
                for idx, point in enumerate(contour_segments):
                    if idx in used:
                        continue
                    dist = math.sqrt((point[0] - current[0])**2 + (point[1] - current[1])**2)
                    if dist < nearest_dist and dist < 0.005:  # ~500m max
                        nearest_dist = dist
                        nearest_idx = idx
                
                if nearest_idx is None:
                    break
                
                line.append(contour_segments[nearest_idx])
                used.add(nearest_idx)
                current = contour_segments[nearest_idx]
            
            if len(line) >= 3:
                lines.append(line)
        
        # Create features
        is_bold = False
        if bold_interval:
            level_index = int((level - min_level) / interval)
            is_bold = (level_index % bold_interval == 0)
        
        for line in lines:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": line
                },
                "properties": {
                    "elevation": float(level),
                    "bold": is_bold,
                    "weight": 3 if is_bold else 2,
                    "name": f"{int(level)}m contour",
                    "label": f"{int(level)}m"
                }
            }
            
            normalized = (level - min_elev_used) / (max_elev_used - min_elev_used) if max_elev_used > min_elev_used else 0.5
            feature['properties']['color'] = get_contour_color_fast(normalized)
            
            features.append(feature)
    
    contour_time = time.time() - start_contour
    print(f"[CONTOURS_FAST] Contour generation completed in {contour_time:.2f}s")
    
    if len(features) == 0:
        raise Exception("No contours generated")
    
    print(f"[CONTOURS_FAST] Generated {len(features)} contour features")
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "interval": interval,
            "bold_interval": bold_interval,
            "count": len(features),
            "bbox": bbox,
            "min_elevation": min_elev_used,
            "max_elevation": max_elev_used
        }
    }

def get_contour_color_fast(normalized):
    """Get color based on normalized elevation (0-1)"""
    normalized = max(0, min(1, normalized))
    
    if normalized < 0.2:
        # Blue (sea level)
        r, g, b = 59, 130, 246
    elif normalized < 0.4:
        # Green (lowlands)
        r, g, b = 34, 197, 94
    elif normalized < 0.6:
        # Yellow (hills)
        r, g, b = 234, 179, 8
    elif normalized < 0.8:
        # Orange (mountains)
        r, g, b = 249, 115, 22
    else:
        # Red (high mountains)
        r, g, b = 239, 68, 68
    
    return f"#{r:02x}{g:02x}{b:02x}"

