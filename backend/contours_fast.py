# contours_fast.py – Fast contour generation using OpenElevation API
# This is MUCH faster than downloading DEM tiles - uses direct elevation API
import requests
import numpy as np
import json
import math

# Scipy imports for proper contouring
try:
    from scipy.ndimage import gaussian_filter
    from scipy.interpolate import griddata
    from matplotlib import pyplot as plt
    from matplotlib import _contour as _cntr
    SCIPY_AVAILABLE = True
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    MATPLOTLIB_AVAILABLE = False
    print("[CONTOURS_FAST] Warning: scipy/matplotlib not available, using simplified method")

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
    
    # Calculate grid resolution based on area size
    area_km2 = abs((maxx - minx) * (maxy - miny)) * 111 * 111  # Approximate km²
    if area_km2 > 100:  # Large area - use coarser grid
        grid_size = 50  # ~50m spacing
    elif area_km2 > 10:  # Medium area
        grid_size = 30  # ~30m spacing
    else:  # Small area
        grid_size = 20  # ~20m spacing
    
    # Create sampling grid
    num_points_x = max(20, int((maxx - minx) * 111 * 1000 / grid_size))  # ~grid_size meters apart
    num_points_y = max(20, int((maxy - miny) * 111 * 1000 / grid_size))
    
    # Limit to reasonable number of points (API can handle ~1000)
    max_points = 500
    if num_points_x * num_points_y > max_points:
        scale = math.sqrt(max_points / (num_points_x * num_points_y))
        num_points_x = max(10, int(num_points_x * scale))
        num_points_y = max(10, int(num_points_y * scale))
    
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
    
    # Generate contours using proper algorithm
    features = []
    min_elev_used = float(min_elev)
    max_elev_used = float(max_elev)
    
    # Use matplotlib's contour algorithm if available (most accurate)
    if MATPLOTLIB_AVAILABLE:
        try:
            # Create coordinate grids
            lon_grid, lat_grid = np.meshgrid(lons, lats)
            
            # Use matplotlib's contour generator (CONREC algorithm)
            contour_generator = _cntr.QuadContourGenerator(
                lon_grid, lat_grid, elevation_grid, None, True, 0
            )
            
            for level in levels:
                if level < min_elev or level > max_elev:
                    continue
                
                # Get contour paths for this level
                paths = contour_generator.create_contour(level)
                
                if not paths:
                    continue
                
                # Determine if this is a bold contour
                is_bold = False
                if bold_interval:
                    level_index = int((level - min_level) / interval)
                    is_bold = (level_index % bold_interval == 0)
                
                # Create features for each contour path
                for path in paths:
                    if len(path) < 3:
                        continue
                    
                    # Convert path to coordinates (path is array of [x, y] pairs)
                    coords = []
                    for i in range(len(path)):
                        lon = float(path[i, 0])
                        lat = float(path[i, 1])
                        # Ensure coordinates are within bbox
                        if minx <= lon <= maxx and miny <= lat <= maxy:
                            coords.append([lon, lat, float(level)])
                    
                    if len(coords) < 3:
                        continue
                    
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": coords
                        },
                        "properties": {
                            "elevation": float(level),
                            "bold": is_bold,
                            "weight": 3 if is_bold else 2,
                            "name": f"{int(level)}m contour",
                            "label": f"{int(level)}m"
                        }
                    }
                    
                    # Add color based on elevation
                    normalized = (level - min_elev_used) / (max_elev_used - min_elev_used) if max_elev_used > min_elev_used else 0.5
                    feature['properties']['color'] = get_contour_color_fast(normalized)
                    
                    features.append(feature)
            
            print(f"[CONTOURS_FAST] Generated {len(features)} contour features using matplotlib CONREC algorithm")
            
        except Exception as e:
            print(f"[CONTOURS_FAST] Matplotlib contouring failed: {e}, using fallback method")
            MATPLOTLIB_AVAILABLE = False
    
    # Fallback: Use simplified method if matplotlib not available
    if not MATPLOTLIB_AVAILABLE or len(features) == 0:
        print(f"[CONTOURS_FAST] Using simplified contour generation method")
        for level in levels:
            if level < min_elev or level > max_elev:
                continue
            
            # Use edge detection to find contour lines
            # Create binary mask for this level
            mask = elevation_grid >= level
            
            # Find edges (where elevation crosses the level)
            edges = []
            for i in range(len(lats) - 1):
                for j in range(len(lons) - 1):
                    # Check all four edges of this cell
                    cell_values = [
                        elevation_grid[i, j],
                        elevation_grid[i, j+1],
                        elevation_grid[i+1, j],
                        elevation_grid[i+1, j+1]
                    ]
                    
                    # Check if level crosses any edge
                    if (min(cell_values) <= level <= max(cell_values)):
                        # Interpolate crossing point
                        lat1, lat2 = float(lats[i]), float(lats[i+1])
                        lon1, lon2 = float(lons[j]), float(lons[j+1])
                        
                        # Simple interpolation
                        if abs(cell_values[0] - cell_values[1]) > 0.1:
                            t = (level - cell_values[0]) / (cell_values[1] - cell_values[0])
                            edges.append([lon1 + t * (lon2 - lon1), lat1, float(level)])
                        
                        if abs(cell_values[0] - cell_values[2]) > 0.1:
                            t = (level - cell_values[0]) / (cell_values[2] - cell_values[0])
                            edges.append([lon1, lat1 + t * (lat2 - lat1), float(level)])
            
            if len(edges) < 3:
                continue
            
            # Group edges into lines (simplified)
            is_bold = False
            if bold_interval:
                level_index = int((level - min_level) / interval)
                is_bold = (level_index % bold_interval == 0)
            
            # Create feature from edges
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": edges[:100]  # Limit to avoid too many points
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

