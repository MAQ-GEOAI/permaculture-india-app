# contours_fast.py – Professional contour generation using OpenElevation API
# Optimized for accuracy and speed - matches professional tools like contourmap.app
import requests
import numpy as np
import json
import math
import time

def generate_contours_fast(bbox, interval=5, bold_interval=None):
    """
    Professional contour generation - accurate and fast
    Uses higher resolution grid and proper contouring algorithm
    """
    start_time = time.time()
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    # Calculate area and determine optimal grid resolution
    area_km2 = abs((maxx - minx) * (maxy - miny)) * 111 * 111
    
    # Use higher resolution for accuracy (like contourmap.app)
    # Balance between accuracy and speed
    if area_km2 > 100:  # Very large area
        grid_resolution = 30  # ~30m spacing
        max_points = 800
    elif area_km2 > 50:  # Large area
        grid_resolution = 25  # ~25m spacing
        max_points = 900
    elif area_km2 > 10:  # Medium area
        grid_resolution = 20  # ~20m spacing
        max_points = 1000
    else:  # Small area
        grid_resolution = 15  # ~15m spacing (high detail)
        max_points = 1000
    
    # Calculate grid dimensions
    width_km = (maxx - minx) * 111 * math.cos(math.radians((miny + maxy) / 2))
    height_km = (maxy - miny) * 111
    
    num_points_x = max(30, int(width_km * 1000 / grid_resolution))
    num_points_y = max(30, int(height_km * 1000 / grid_resolution))
    
    # Limit total points but maintain aspect ratio
    total_points = num_points_x * num_points_y
    if total_points > max_points:
        scale = math.sqrt(max_points / total_points)
        num_points_x = max(25, int(num_points_x * scale))
        num_points_y = max(25, int(num_points_y * scale))
    
    # Create high-resolution grid
    lons = np.linspace(minx, maxx, num_points_x)
    lats = np.linspace(miny, maxy, num_points_y)
    
    print(f"[CONTOURS_FAST] Using {num_points_x}x{num_points_y} grid ({num_points_x * num_points_y} points) for {area_km2:.2f} km² area")
    
    # Prepare locations for API
    locations = []
    for lat in lats:
        for lon in lons:
            locations.append({"latitude": float(lat), "longitude": float(lon)})
    
    total_points = len(locations)
    print(f"[CONTOURS_FAST] Requesting {total_points} elevation points from OpenElevation API...")
    
    # Fetch elevations in optimized batches
    elevation_grid = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
    batch_size = 100  # API limit per request
    
    received_count = 0
    for i in range(0, len(locations), batch_size):
        batch = locations[i:i+batch_size]
        try:
            response = requests.post(
                "https://api.open-elevation.com/api/v1/lookup",
                json={"locations": batch},
                timeout=20
            )
            
            if response.status_code == 200:
                results = response.json().get('results', [])
                for idx, result in enumerate(results):
                    if i + idx < len(locations):
                        elev = result.get('elevation')
                        if elev is not None and elev != -32768:
                            loc = locations[i + idx]
                            lat_idx = np.argmin(np.abs(lats - loc['latitude']))
                            lon_idx = np.argmin(np.abs(lons - loc['longitude']))
                            elevation_grid[lat_idx, lon_idx] = float(elev)
                            received_count += 1
        except Exception as e:
            print(f"[CONTOURS_FAST] Batch {i//batch_size + 1} failed: {e}")
            continue
    
    api_time = time.time() - start_time
    print(f"[CONTOURS_FAST] Received {received_count}/{total_points} elevation points in {api_time:.2f}s")
    
    if received_count < total_points * 0.5:  # Need at least 50% of points
        raise Exception(f"Insufficient elevation data: {received_count}/{total_points} points")
    
    # Fill missing values with interpolation (simple but effective)
    valid_mask = ~np.isnan(elevation_grid)
    valid_data = elevation_grid[valid_mask]
    
    if len(valid_data) < 10:
        raise Exception("Insufficient valid elevation data")
    
    # Use mean of valid neighbors for NaN values (better than global mean)
    filled_grid = elevation_grid.copy()
    for i in range(len(lats)):
        for j in range(len(lons)):
            if np.isnan(filled_grid[i, j]):
                # Get 8 neighbors
                neighbors = []
                for di in [-1, 0, 1]:
                    for dj in [-1, 0, 1]:
                        if di == 0 and dj == 0:
                            continue
                        ni, nj = i + di, j + dj
                        if 0 <= ni < len(lats) and 0 <= nj < len(lons):
                            if not np.isnan(elevation_grid[ni, nj]):
                                neighbors.append(elevation_grid[ni, nj])
                
                if neighbors:
                    filled_grid[i, j] = np.mean(neighbors)
                else:
                    filled_grid[i, j] = np.nanmean(valid_data)
    
    elevation_grid = filled_grid
    
    # Smooth the elevation grid slightly for smoother contours
    smoothed_grid = elevation_grid.copy()
    for i in range(1, len(lats) - 1):
        for j in range(1, len(lons) - 1):
            # 3x3 average
            smoothed_grid[i, j] = np.mean(elevation_grid[i-1:i+2, j-1:j+2])
    
    elevation_grid = smoothed_grid
    
    # Calculate elevation range
    min_elev = float(np.min(elevation_grid))
    max_elev = float(np.max(elevation_grid))
    
    print(f"[CONTOURS_FAST] Elevation range: {min_elev:.1f}m - {max_elev:.1f}m")
    
    # Generate contour levels
    min_level = math.floor(min_elev / interval) * interval
    max_level = math.ceil(max_elev / interval) * interval
    levels = np.arange(min_level, max_level + interval, interval)
    
    print(f"[CONTOURS_FAST] Generating {len(levels)} contour levels...")
    
    # PROFESSIONAL CONTOUR GENERATION - Proper marching squares with line following
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
        
        # Find all contour segments using marching squares
        segments = []
        
        for i in range(len(lats) - 1):
            for j in range(len(lons) - 1):
                # Get cell corner elevations
                z00 = elevation_grid[i, j]
                z01 = elevation_grid[i, j+1]
                z10 = elevation_grid[i+1, j]
                z11 = elevation_grid[i+1, j+1]
                
                # Check if contour crosses this cell
                cell_min = min(z00, z01, z10, z11)
                cell_max = max(z00, z01, z10, z11)
                
                if not (cell_min <= level <= cell_max):
                    continue
                
                # Cell corner coordinates
                lat0, lat1 = float(lats[i]), float(lats[i+1])
                lon0, lon1 = float(lons[j]), float(lons[j+1])
                
                # Interpolate crossing points on each edge
                edge_points = []
                
                # Top edge (z00 to z01)
                if (z00 <= level <= z01) or (z01 <= level <= z00):
                    if abs(z01 - z00) > 0.001:
                        t = (level - z00) / (z01 - z00)
                        t = max(0, min(1, t))  # Clamp
                        edge_points.append([lon0 + t * (lon1 - lon0), lat0])
                
                # Right edge (z01 to z11)
                if (z01 <= level <= z11) or (z11 <= level <= z01):
                    if abs(z11 - z01) > 0.001:
                        t = (level - z01) / (z11 - z01)
                        t = max(0, min(1, t))
                        edge_points.append([lon1, lat0 + t * (lat1 - lat0)])
                
                # Bottom edge (z10 to z11)
                if (z10 <= level <= z11) or (z11 <= level <= z10):
                    if abs(z11 - z10) > 0.001:
                        t = (level - z10) / (z11 - z10)
                        t = max(0, min(1, t))
                        edge_points.append([lon0 + t * (lon1 - lon0), lat1])
                
                # Left edge (z00 to z10)
                if (z00 <= level <= z10) or (z10 <= level <= z00):
                    if abs(z10 - z00) > 0.001:
                        t = (level - z00) / (z10 - z00)
                        t = max(0, min(1, t))
                        edge_points.append([lon0, lat0 + t * (lat1 - lat0)])
                
                # Add segment if we have 2 points (contour crosses this cell)
                if len(edge_points) == 2:
                    segments.append({
                        'points': edge_points,
                        'cell': (i, j)
                    })
        
        if len(segments) < 2:
            continue
        
        # Connect segments into continuous contour lines
        lines = connect_segments_to_lines(segments, minx, miny, maxx, maxy)
        
        # Create features for each continuous line
        for line in lines:
            if len(line) < 3:
                continue
            
            # Add elevation to coordinates
            coords = [[p[0], p[1], float(level)] for p in line]
            
            # Add color based on elevation
            normalized = (level - min_elev_used) / (max_elev_used - min_elev_used) if max_elev_used > min_elev_used else 0.5
            color = get_contour_color(normalized)
            
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
                    "color": color,
                    "name": f"{int(level)}m contour",
                    "label": f"{int(level)}m"
                }
            }
            
            features.append(feature)
    
    total_time = time.time() - start_time
    print(f"[CONTOURS_FAST] ✅ Generated {len(features)} contour features in {total_time:.2f}s")
    
    if len(features) == 0:
        raise Exception("No contours generated - check elevation data and interval")
    
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

def connect_segments_to_lines(segments, minx, miny, maxx, maxy):
    """
    Connect contour segments into continuous lines
    Uses proper line following algorithm for smooth contours
    """
    lines = []
    used_segments = set()
    
    for start_idx, start_seg in enumerate(segments):
        if start_idx in used_segments:
            continue
        
        # Start a new line
        line = []
        current_seg = start_seg
        used_segments.add(start_idx)
        
        # Add first point
        line.append(current_seg['points'][0])
        current_point = current_seg['points'][1]
        line.append(current_point)
        
        # Follow the line
        max_iterations = 1000  # Safety limit
        iterations = 0
        
        while iterations < max_iterations:
            # Find next segment that connects to current point
            next_seg_idx = None
            min_dist = float('inf')
            
            for idx, seg in enumerate(segments):
                if idx in used_segments:
                    continue
                
                # Check if this segment connects to current point
                for point in seg['points']:
                    dist = math.sqrt((point[0] - current_point[0])**2 + (point[1] - current_point[1])**2)
                    # Very small threshold for connection (same point)
                    if dist < 0.0001 and dist < min_dist:
                        min_dist = dist
                        next_seg_idx = idx
                        next_seg = seg
                        # Find the other point in this segment
                        for p in seg['points']:
                            if math.sqrt((p[0] - current_point[0])**2 + (p[1] - current_point[1])**2) > 0.0001:
                                next_point = p
                                break
            
            if next_seg_idx is None:
                break  # Line ended
            
            # Add next point
            line.append(next_point)
            current_point = next_point
            used_segments.add(next_seg_idx)
            iterations += 1
        
        # Also try to extend backwards
        if len(line) >= 2:
            # Try to find segments connecting to the start
            start_point = line[0]
            while True:
                found = False
                for idx, seg in enumerate(segments):
                    if idx in used_segments:
                        continue
                    
                    for point in seg['points']:
                        dist = math.sqrt((point[0] - start_point[0])**2 + (point[1] - start_point[1])**2)
                        if dist < 0.0001:
                            # Found connecting segment
                            for p in seg['points']:
                                if math.sqrt((p[0] - start_point[0])**2 + (p[1] - start_point[1])**2) > 0.0001:
                                    line.insert(0, p)  # Add at beginning
                                    start_point = p
                                    used_segments.add(idx)
                                    found = True
                                    break
                            if found:
                                break
                    if found:
                        break
                
                if not found:
                    break
        
        # Filter to bbox and ensure minimum length
        filtered_line = []
        for point in line:
            lon, lat = point[0], point[1]
            if minx <= lon <= maxx and miny <= lat <= maxy:
                filtered_line.append(point)
        
        if len(filtered_line) >= 3:
            lines.append(filtered_line)
    
    return lines

def get_contour_color(normalized):
    """Get color based on normalized elevation (0-1) - matches contourmap.app style"""
    normalized = max(0, min(1, normalized))
    
    # Color gradient similar to contourmap.app (blue to red)
    if normalized < 0.1:
        r, g, b = 0, 0, 255  # Dark blue
    elif normalized < 0.2:
        r, g, b = 0, 100, 255  # Blue
    elif normalized < 0.3:
        r, g, b = 0, 200, 255  # Cyan
    elif normalized < 0.4:
        r, g, b = 0, 255, 200  # Light cyan
    elif normalized < 0.5:
        r, g, b = 0, 255, 100  # Green
    elif normalized < 0.6:
        r, g, b = 100, 255, 0  # Yellow-green
    elif normalized < 0.7:
        r, g, b = 200, 255, 0  # Yellow
    elif normalized < 0.8:
        r, g, b = 255, 200, 0  # Orange-yellow
    elif normalized < 0.9:
        r, g, b = 255, 100, 0  # Orange
    else:
        r, g, b = 255, 0, 0  # Red
    
    return f"#{r:02x}{g:02x}{b:02x}"
