# contours_fast.py – ULTRA-FAST contour generation using OpenElevation API
# Optimized for speed and reliability - delivers results in 10-20 seconds
import requests
import numpy as np
import json
import math
import time

def generate_contours_fast(bbox, interval=5, bold_interval=None):
    """
    ULTRA-FAST contour generation - optimized for production
    Uses minimal API calls and simple algorithm for speed
    """
    start_time = time.time()
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    # Calculate area and determine optimal grid size
    area_km2 = abs((maxx - minx) * (maxy - miny)) * 111 * 111
    
    # Use smaller grid for speed - max 200 points total
    if area_km2 > 50:
        grid_size = 20  # 20x20 = 400 points max
    elif area_km2 > 10:
        grid_size = 15  # 15x15 = 225 points
    else:
        grid_size = 12  # 12x12 = 144 points
    
    # Create grid
    num_points = min(grid_size, 20)  # Cap at 20x20 = 400 points
    lons = np.linspace(minx, maxx, num_points)
    lats = np.linspace(miny, maxy, num_points)
    
    # Prepare locations
    locations = []
    for lat in lats:
        for lon in lons:
            locations.append({"latitude": float(lat), "longitude": float(lon)})
    
    print(f"[CONTOURS_FAST] Requesting {len(locations)} elevation points...")
    
    # Fetch elevations - single batch request (faster)
    elevation_grid = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
    
    try:
        # Single request for all points (API handles up to 1000)
        response = requests.post(
            "https://api.open-elevation.com/api/v1/lookup",
            json={"locations": locations},
            timeout=15  # Shorter timeout
        )
        
        if response.status_code == 200:
            results = response.json().get('results', [])
            for idx, result in enumerate(results):
                if idx < len(locations):
                    elev = result.get('elevation')
                    if elev is not None and elev != -32768:
                        loc = locations[idx]
                        lat_idx = np.argmin(np.abs(lats - loc['latitude']))
                        lon_idx = np.argmin(np.abs(lons - loc['longitude']))
                        elevation_grid[lat_idx, lon_idx] = float(elev)
        else:
            raise Exception(f"API returned status {response.status_code}")
    except Exception as e:
        print(f"[CONTOURS_FAST] API request failed: {e}")
        raise Exception(f"Failed to fetch elevation data: {e}")
    
    api_time = time.time() - start_time
    print(f"[CONTOURS_FAST] Elevation data fetched in {api_time:.2f}s")
    
    # Fill NaN with mean
    valid_data = elevation_grid[~np.isnan(elevation_grid)]
    if len(valid_data) < 10:
        raise Exception("Insufficient elevation data")
    
    mean_elev = np.nanmean(elevation_grid)
    elevation_grid[np.isnan(elevation_grid)] = mean_elev
    
    # Calculate elevation range
    min_elev = float(np.min(elevation_grid))
    max_elev = float(np.max(elevation_grid))
    
    # Generate contour levels
    min_level = math.floor(min_elev / interval) * interval
    max_level = math.ceil(max_elev / interval) * interval
    levels = np.arange(min_level, max_level + interval, interval)
    
    print(f"[CONTOURS_FAST] Generating {len(levels)} contour levels (range: {min_elev:.1f}m - {max_elev:.1f}m)")
    
    # SIMPLE MARCHING SQUARES - Fast and reliable
    features = []
    min_elev_used = min_elev
    max_elev_used = max_elev
    
    for level in levels:
        if level < min_elev or level > max_elev:
            continue
        
        # Determine if bold
        is_bold = False
        if bold_interval:
            level_index = int((level - min_level) / interval)
            is_bold = (level_index % bold_interval == 0)
        
        # Find contour points using simple edge detection
        contour_points = []
        
        for i in range(len(lats) - 1):
            for j in range(len(lons) - 1):
                # Get cell corners
                z00 = elevation_grid[i, j]
                z01 = elevation_grid[i, j+1]
                z10 = elevation_grid[i+1, j]
                z11 = elevation_grid[i+1, j+1]
                
                # Check if contour crosses this cell
                cell_min = min(z00, z01, z10, z11)
                cell_max = max(z00, z01, z10, z11)
                
                if not (cell_min <= level <= cell_max):
                    continue
                
                # Cell coordinates
                lat0, lat1 = float(lats[i]), float(lats[i+1])
                lon0, lon1 = float(lons[j]), float(lons[j+1])
                
                # Interpolate crossing points on edges
                # Top edge
                if (z00 <= level <= z01) or (z01 <= level <= z00):
                    if abs(z01 - z00) > 0.01:
                        t = (level - z00) / (z01 - z00) if abs(z01 - z00) > 0.01 else 0.5
                        contour_points.append([lon0 + t * (lon1 - lon0), lat0, float(level)])
                
                # Right edge
                if (z01 <= level <= z11) or (z11 <= level <= z01):
                    if abs(z11 - z01) > 0.01:
                        t = (level - z01) / (z11 - z01) if abs(z11 - z01) > 0.01 else 0.5
                        contour_points.append([lon1, lat0 + t * (lat1 - lat0), float(level)])
                
                # Bottom edge
                if (z10 <= level <= z11) or (z11 <= level <= z10):
                    if abs(z11 - z10) > 0.01:
                        t = (level - z10) / (z11 - z10) if abs(z11 - z10) > 0.01 else 0.5
                        contour_points.append([lon0 + t * (lon1 - lon0), lat1, float(level)])
                
                # Left edge
                if (z00 <= level <= z10) or (z10 <= level <= z00):
                    if abs(z10 - z00) > 0.01:
                        t = (level - z00) / (z10 - z00) if abs(z10 - z00) > 0.01 else 0.5
                        contour_points.append([lon0, lat0 + t * (lat1 - lat0), float(level)])
        
        if len(contour_points) < 3:
            continue
        
        # Connect points into lines (simple nearest neighbor)
        lines = []
        used = set()
        
        for start_idx in range(len(contour_points)):
            if start_idx in used:
                continue
            
            line = [contour_points[start_idx]]
            used.add(start_idx)
            current = contour_points[start_idx]
            
            # Connect nearest points
            max_iterations = 100  # Prevent infinite loops
            iterations = 0
            
            while iterations < max_iterations:
                nearest_idx = None
                nearest_dist = float('inf')
                
                for idx, point in enumerate(contour_points):
                    if idx in used:
                        continue
                    
                    dist = math.sqrt((point[0] - current[0])**2 + (point[1] - current[1])**2)
                    # Max distance: ~500m (0.005 degrees)
                    if dist < nearest_dist and dist < 0.005:
                        nearest_dist = dist
                        nearest_idx = idx
                
                if nearest_idx is None:
                    break
                
                line.append(contour_points[nearest_idx])
                used.add(nearest_idx)
                current = contour_points[nearest_idx]
                iterations += 1
            
            if len(line) >= 3:
                lines.append(line)
        
        # Create features
        for line in lines:
            # Filter coordinates to be within bbox
            filtered_coords = []
            for coord in line:
                lon, lat = coord[0], coord[1]
                if minx <= lon <= maxx and miny <= lat <= maxy:
                    filtered_coords.append(coord)
            
            if len(filtered_coords) < 3:
                continue
            
            # Add color
            normalized = (level - min_elev_used) / (max_elev_used - min_elev_used) if max_elev_used > min_elev_used else 0.5
            color = get_contour_color(normalized)
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": filtered_coords
                },
                "properties": {
                    "elevation": float(level),
                    "bold": is_bold,
                    "weight": 3 if is_bold else 2,
                    "color": color,
                    "name": f"{int(level)}m contour",
                    "label": f"{int(level)}m"
                }
            }
            
            features.append(feature)
    
    total_time = time.time() - start_time
    print(f"[CONTOURS_FAST] Generated {len(features)} contours in {total_time:.2f}s total")
    
    if len(features) == 0:
        raise Exception("No contours generated - check elevation data")
    
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

def get_contour_color(normalized):
    """Get color based on normalized elevation (0-1)"""
    normalized = max(0, min(1, normalized))
    
    if normalized < 0.2:
        r, g, b = 59, 130, 246  # Blue
    elif normalized < 0.4:
        r, g, b = 34, 197, 94   # Green
    elif normalized < 0.6:
        r, g, b = 234, 179, 8   # Yellow
    elif normalized < 0.8:
        r, g, b = 249, 115, 22  # Orange
    else:
        r, g, b = 239, 68, 68   # Red
    
    return f"#{r:02x}{g:02x}{b:02x}"
