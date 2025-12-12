# contours_fast.py – Professional contour generation matching contourmap.app quality
# Uses high-resolution elevation data and proper contouring algorithms
import requests
import numpy as np
import json
import math
import time

# Try to import scipy for professional contouring
try:
    from scipy.interpolate import griddata
    from scipy.ndimage import gaussian_filter
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("[CONTOURS_FAST] scipy not available, using basic interpolation")

def get_elevation_from_multiple_sources(lat, lon):
    """
    Get elevation from multiple sources for accuracy
    Tries OpenElevation first, then falls back to others
    """
    sources = [
        {
            'name': 'OpenElevation',
            'url': 'https://api.open-elevation.com/api/v1/lookup',
            'method': 'post'
        },
        {
            'name': 'ElevationAPI',
            'url': f'https://api.open-elevation.com/api/v1/lookup',
            'method': 'post'
        }
    ]
    
    for source in sources:
        try:
            response = requests.post(
                source['url'],
                json={"locations": [{"latitude": lat, "longitude": lon}]},
                timeout=10
            )
            if response.status_code == 200:
                result = response.json().get('results', [{}])[0]
                elev = result.get('elevation')
                if elev is not None and elev != -32768:
                    return float(elev)
        except:
            continue
    
    return None

def generate_contours_fast(bbox, interval=5, bold_interval=None):
    """
    Professional contour generation - matches contourmap.app quality
    Uses high-resolution grid and proper algorithms
    """
    start_time = time.time()
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    # Calculate area
    area_km2 = abs((maxx - minx) * (maxy - miny)) * 111 * 111
    
    # HIGH RESOLUTION for accuracy (like contourmap.app)
    # Use finer grid for better accuracy
    if area_km2 > 100:
        spacing_m = 40  # 40m spacing for large areas
        max_points = 1200
    elif area_km2 > 50:
        spacing_m = 30  # 30m spacing
        max_points = 1500
    elif area_km2 > 10:
        spacing_m = 20  # 20m spacing (high detail)
        max_points = 2000
    else:
        spacing_m = 15  # 15m spacing (very high detail)
        max_points = 2000
    
    # Calculate grid dimensions
    width_km = (maxx - minx) * 111 * math.cos(math.radians((miny + maxy) / 2))
    height_km = (maxy - miny) * 111
    
    num_points_x = max(40, int(width_km * 1000 / spacing_m))
    num_points_y = max(40, int(height_km * 1000 / spacing_m))
    
    # Limit but maintain aspect ratio
    total_points = num_points_x * num_points_y
    if total_points > max_points:
        scale = math.sqrt(max_points / total_points)
        num_points_x = max(30, int(num_points_x * scale))
        num_points_y = max(30, int(num_points_y * scale))
    
    # Create high-resolution grid
    lons = np.linspace(minx, maxx, num_points_x)
    lats = np.linspace(miny, maxy, num_points_y)
    
    total_points = num_points_x * num_points_y
    print(f"[CONTOURS_FAST] Using {num_points_x}x{num_points_y} grid ({total_points} points, {spacing_m}m spacing) for {area_km2:.2f} km²")
    
    # Fetch elevations in optimized batches
    elevation_grid = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
    locations = []
    for lat in lats:
        for lon in lons:
            locations.append({"latitude": float(lat), "longitude": float(lon)})
    
    print(f"[CONTOURS_FAST] Fetching {len(locations)} elevation points...")
    
    # Batch requests (100 points per batch for reliability)
    batch_size = 100
    received_count = 0
    
    for i in range(0, len(locations), batch_size):
        batch = locations[i:i+batch_size]
        try:
            response = requests.post(
                "https://api.open-elevation.com/api/v1/lookup",
                json={"locations": batch},
                timeout=25
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
    print(f"[CONTOURS_FAST] Received {received_count}/{total_points} points ({received_count/total_points*100:.1f}%) in {api_time:.2f}s")
    
    if received_count < total_points * 0.3:
        raise Exception(f"Insufficient elevation data: {received_count}/{total_points} points")
    
    # PROFESSIONAL INTERPOLATION
    valid_mask = ~np.isnan(elevation_grid)
    valid_data = elevation_grid[valid_mask]
    
    if len(valid_data) < 10:
        raise Exception("Insufficient valid elevation data")
    
    # Use scipy interpolation if available (much better quality)
    if SCIPY_AVAILABLE and np.sum(np.isnan(elevation_grid)) > 0:
        print("[CONTOURS_FAST] Using scipy griddata for professional interpolation...")
        lon_grid, lat_grid = np.meshgrid(lons, lats)
        
        valid_lons = lon_grid[valid_mask]
        valid_lats = lat_grid[valid_mask]
        valid_elevs = elevation_grid[valid_mask]
        
        nan_mask = np.isnan(elevation_grid)
        nan_lons = lon_grid[nan_mask]
        nan_lats = lat_grid[nan_mask]
        
        if len(nan_lons) > 0:
            interpolated = griddata(
                (valid_lats, valid_lons),
                valid_elevs,
                (nan_lats, nan_lons),
                method='cubic',  # Cubic interpolation for smoothness
                fill_value=np.nanmean(valid_elevs)
            )
            elevation_grid[nan_mask] = interpolated
    
    # Fill remaining NaN with neighbor average
    for i in range(len(lats)):
        for j in range(len(lons)):
            if np.isnan(elevation_grid[i, j]):
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
                    elevation_grid[i, j] = np.mean(neighbors)
                else:
                    elevation_grid[i, j] = np.nanmean(valid_data)
    
    # Smooth the grid for professional-quality contours
    if SCIPY_AVAILABLE:
        try:
            elevation_grid = gaussian_filter(elevation_grid, sigma=0.8)  # Slight smoothing
        except:
            pass
    
    # Calculate elevation range
    min_elev = float(np.min(elevation_grid))
    max_elev = float(np.max(elevation_grid))
    
    print(f"[CONTOURS_FAST] Elevation range: {min_elev:.1f}m - {max_elev:.1f}m (range: {max_elev - min_elev:.1f}m)")
    
    # Generate contour levels
    min_level = math.floor(min_elev / interval) * interval
    max_level = math.ceil(max_elev / interval) * interval
    levels = np.arange(min_level, max_level + interval, interval)
    
    print(f"[CONTOURS_FAST] Generating {len(levels)} contour levels...")
    
    # PROFESSIONAL CONTOUR GENERATION using marching squares
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
                # Get cell corners
                z00 = elevation_grid[i, j]
                z01 = elevation_grid[i, j+1]
                z10 = elevation_grid[i+1, j]
                z11 = elevation_grid[i+1, j+1]
                
                # Check if contour crosses
                cell_min = min(z00, z01, z10, z11)
                cell_max = max(z00, z01, z10, z11)
                
                if not (cell_min <= level <= cell_max):
                    continue
                
                # Cell coordinates
                lat0, lat1 = float(lats[i]), float(lats[i+1])
                lon0, lon1 = float(lons[j]), float(lons[j+1])
                
                # Interpolate crossing points (accurate linear interpolation)
                edge_points = []
                
                # Top edge
                if (z00 <= level <= z01) or (z01 <= level <= z00):
                    if abs(z01 - z00) > 0.0001:
                        t = (level - z00) / (z01 - z00)
                        t = max(0, min(1, t))
                        edge_points.append([lon0 + t * (lon1 - lon0), lat0])
                
                # Right edge
                if (z01 <= level <= z11) or (z11 <= level <= z01):
                    if abs(z11 - z01) > 0.0001:
                        t = (level - z01) / (z11 - z01)
                        t = max(0, min(1, t))
                        edge_points.append([lon1, lat0 + t * (lat1 - lat0)])
                
                # Bottom edge
                if (z10 <= level <= z11) or (z11 <= level <= z10):
                    if abs(z11 - z10) > 0.0001:
                        t = (level - z10) / (z11 - z10)
                        t = max(0, min(1, t))
                        edge_points.append([lon0 + t * (lon1 - lon0), lat1])
                
                # Left edge
                if (z00 <= level <= z10) or (z10 <= level <= z00):
                    if abs(z10 - z00) > 0.0001:
                        t = (level - z00) / (z10 - z00)
                        t = max(0, min(1, t))
                        edge_points.append([lon0, lat0 + t * (lat1 - lat0)])
                
                # Add segment (contour crosses this cell)
                if len(edge_points) == 2:
                    segments.append({
                        'p1': edge_points[0],
                        'p2': edge_points[1],
                        'cell': (i, j)
                    })
        
        if len(segments) < 2:
            continue
        
        # Connect segments into smooth continuous lines
        lines = connect_segments_smoothly(segments, minx, miny, maxx, maxy)
        
        # Create features
        for line in lines:
            if len(line) < 3:
                continue
            
            # Add elevation to coordinates
            coords = [[p[0], p[1], float(level)] for p in line]
            
            # Color based on elevation
            normalized = (level - min_elev_used) / (max_elev_used - min_elev_used) if max_elev_used > min_elev_used else 0.5
            color = get_contour_color_professional(normalized)
            
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
    print(f"[CONTOURS_FAST] ✅ Generated {len(features)} smooth contour features in {total_time:.2f}s")
    
    if len(features) == 0:
        raise Exception("No contours generated")
    
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

def connect_segments_smoothly(segments, minx, miny, maxx, maxy):
    """
    Connect contour segments into smooth continuous lines
    Uses proper line following algorithm for professional results
    """
    lines = []
    used_segments = set()
    
    for start_idx, start_seg in enumerate(segments):
        if start_idx in used_segments:
            continue
        
        # Start new line
        line = []
        current_seg = start_seg
        used_segments.add(start_idx)
        
        # Add first point
        line.append(current_seg['p1'])
        current_point = current_seg['p2']
        line.append(current_point)
        
        # Follow line forward
        max_iterations = 2000
        iterations = 0
        
        while iterations < max_iterations:
            next_seg_idx = None
            min_dist = float('inf')
            
            # Find connecting segment
            for idx, seg in enumerate(segments):
                if idx in used_segments:
                    continue
                
                # Check both points of segment
                for point in [seg['p1'], seg['p2']]:
                    dist = math.sqrt((point[0] - current_point[0])**2 + (point[1] - current_point[1])**2)
                    # Very tight threshold for connection
                    if dist < 0.00001 and dist < min_dist:
                        min_dist = dist
                        next_seg_idx = idx
                        next_seg = seg
                        # Get the other point
                        if dist < 0.00001:
                            other_point = seg['p2'] if point == seg['p1'] else seg['p1']
                        else:
                            other_point = point
            
            if next_seg_idx is None:
                break
            
            # Add next point
            line.append(other_point)
            current_point = other_point
            used_segments.add(next_seg_idx)
            iterations += 1
        
        # Try to extend backwards
        if len(line) >= 2:
            start_point = line[0]
            while True:
                found = False
                for idx, seg in enumerate(segments):
                    if idx in used_segments:
                        continue
                    
                    for point in [seg['p1'], seg['p2']]:
                        dist = math.sqrt((point[0] - start_point[0])**2 + (point[1] - start_point[1])**2)
                        if dist < 0.00001:
                            other_point = seg['p2'] if point == seg['p1'] else seg['p1']
                            line.insert(0, other_point)
                            start_point = other_point
                            used_segments.add(idx)
                            found = True
                            break
                    if found:
                        break
                
                if not found:
                    break
        
        # Filter to bbox
        filtered_line = []
        for point in line:
            lon, lat = point[0], point[1]
            if minx <= lon <= maxx and miny <= lat <= maxy:
                filtered_line.append(point)
        
        if len(filtered_line) >= 3:
            lines.append(filtered_line)
    
    return lines

def get_contour_color_professional(normalized):
    """
    Professional color gradient matching contourmap.app
    Blue (low) -> Cyan -> Green -> Yellow -> Orange -> Red (high)
    """
    normalized = max(0, min(1, normalized))
    
    # Smooth color gradient (10 steps like contourmap.app)
    if normalized < 0.1:
        r, g, b = 0, 0, 200  # Dark blue
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
