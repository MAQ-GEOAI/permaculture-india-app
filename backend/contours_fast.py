# contours_fast.py – Fast contour generation using OpenElevation API
# This is MUCH faster than downloading DEM tiles - uses direct elevation API
import requests
import numpy as np
import json
from scipy.interpolate import griddata
from scipy.ndimage import gaussian_filter
import math

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
    
    # Fill NaN values with interpolation
    valid_mask = ~np.isnan(elevation_grid)
    if np.sum(valid_mask) < 10:
        raise Exception("Insufficient valid elevation data")
    
    # Get valid points for interpolation
    valid_lats, valid_lons = np.meshgrid(lats, lons, indexing='ij')
    valid_points = np.column_stack([valid_lats[valid_mask], valid_lons[valid_mask]])
    valid_elevations = elevation_grid[valid_mask]
    
    # Interpolate missing values
    all_points = np.column_stack([valid_lats.flatten(), valid_lons.flatten()])
    interpolated = griddata(valid_points, valid_elevations, all_points, method='cubic', fill_value=np.nanmean(valid_elevations))
    elevation_grid = interpolated.reshape(elevation_grid.shape)
    
    # Smooth the data slightly
    elevation_grid = gaussian_filter(elevation_grid, sigma=0.5)
    
    # Calculate min/max for contour levels
    min_elev = np.nanmin(elevation_grid)
    max_elev = np.nanmax(elevation_grid)
    
    # Generate contour levels
    min_level = math.floor(min_elev / interval) * interval
    max_level = math.ceil(max_elev / interval) * interval
    levels = np.arange(min_level, max_level + interval, interval)
    
    print(f"[CONTOURS_FAST] Generating contours at {len(levels)} levels (elevation range: {min_elev:.1f}m - {max_elev:.1f}m)")
    
    # Generate contours using marching squares algorithm (simplified)
    from scipy import ndimage
    
    features = []
    min_elev_used = float(min_elev)
    max_elev_used = float(max_elev)
    
    for level in levels:
        if level < min_elev or level > max_elev:
            continue
        
        # Create binary mask for this contour level
        mask = elevation_grid >= level
        
        # Find contours using edge detection
        edges = np.zeros_like(mask, dtype=bool)
        edges[:-1, :] |= mask[:-1, :] != mask[1:, :]  # Vertical edges
        edges[:, :-1] |= mask[:, :-1] != mask[:, 1:]  # Horizontal edges
        
        # Extract contour coordinates
        edge_coords = np.argwhere(edges)
        if len(edge_coords) < 3:  # Need at least 3 points for a line
            continue
        
        # Group points into continuous lines (simplified - just create one feature per level)
        # Convert grid indices to lat/lon
        contour_coords = []
        for lat_idx, lon_idx in edge_coords:
            lat = float(lats[lat_idx])
            lon = float(lons[lon_idx])
            elev = float(elevation_grid[lat_idx, lon_idx])
            contour_coords.append([lon, lat, elev])
        
        if len(contour_coords) < 3:
            continue
        
        # Determine if this is a bold contour
        is_bold = False
        if bold_interval:
            level_index = int((level - min_level) / interval)
            is_bold = (level_index % bold_interval == 0)
        
        # Create feature
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[c[0], c[1], c[2]] for c in contour_coords]
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

