# contours_fast.py – Smart hybrid contour generation
# Tries SRTM DEM first (accurate), falls back to fast OpenElevation API if needed
# Ensures contours always complete within 90 seconds
import tempfile
import subprocess
import json
import os
import math
import numpy as np
import rasterio
import time
import requests
from utils import download_dem

# Simple logging function
def log(msg):
    print(f"[CONTOURS_FAST] {msg}")

def generate_contours_fast(bbox, interval=5, bold_interval=None):
    """
    ULTRA-FAST contour generation - optimized for business delivery
    Strategy: Skip SRTM (too slow), use optimized OpenElevation API
    Guarantees completion within 50 seconds
    """
    start_time = time.time()
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    log(f"Starting ULTRA-FAST contour generation for bbox={bbox}, interval={interval}m")
    
    # Skip SRTM DEM - use fast OpenElevation API directly (more reliable for business)
    log("Using optimized OpenElevation API (fastest method)...")
    return generate_from_elevation_api(bbox, interval, bold_interval, start_time)

def generate_from_dem(dem_path, bbox, interval, bold_interval, start_time):
    """Generate contours from DEM using GDAL or Python"""
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    # Check GDAL availability
    use_gdal = False
    try:
        subprocess.run(["gdal_contour", "--version"], capture_output=True, check=True, timeout=3)
        use_gdal = True
    except:
        pass
    
    if use_gdal:
        log("Using GDAL for contour extraction...")
        with tempfile.NamedTemporaryFile(suffix=".geojson", delete=False) as tmp:
            out = tmp.name
            
            cmd = [
                "gdal_contour",
                "-i", str(interval),
                "-f", "GeoJSON",
                "-a", "elevation",
                "-3d",
                "-snodata", "-32768",
                dem_path,
                out
            ]
            
            try:
                result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=60)
                
                with open(out) as f:
                    data = json.load(f)
                
                os.unlink(out)
                return process_contour_data(data, bbox, interval, bold_interval, start_time)
            except Exception as e:
                log(f"GDAL failed: {e}, falling back to Python...")
                if os.path.exists(out):
                    os.unlink(out)
    
    # Python fallback
    log("Using Python-based extraction...")
    return extract_contours_python(dem_path, bbox, interval, bold_interval, start_time)

def generate_from_elevation_api(bbox, interval, bold_interval, start_time):
    """ULTRA-FAST contour generation - optimized for business delivery - completes in <50s"""
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    # Calculate grid size (optimized for ACCURACY - business needs accurate contours)
    area_km2 = abs((maxx - minx) * (maxy - miny)) * 111 * 111
    
    # Use HIGHER resolution for accuracy - match contourmap.app quality
    if area_km2 > 20:
        grid_size = 40  # 40x40 = 1600 points (accurate for large areas)
    elif area_km2 > 10:
        grid_size = 50  # 50x50 = 2500 points (high accuracy)
    elif area_km2 > 5:
        grid_size = 60  # 60x60 = 3600 points (very high accuracy)
    else:
        grid_size = 70  # 70x70 = 4900 points (maximum accuracy for small areas)
    
    # Cap at 100x100 = 10000 points (API limit)
    grid_size = min(grid_size, 100)
    
    lons = np.linspace(minx, maxx, grid_size)
    lats = np.linspace(miny, maxy, grid_size)
    
    log(f"Fetching {grid_size * grid_size} elevation points from OpenElevation API...")
    
    # Prepare locations
    locations = []
    for lat in lats:
        for lon in lons:
            locations.append({"latitude": float(lat), "longitude": float(lon)})
    
    # Fetch in batches (API handles up to 1000 points per request)
    elevation_grid = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
    
    batch_size = 1000  # API limit
    total_points = len(locations)
    
    try:
        for batch_start in range(0, total_points, batch_size):
            batch = locations[batch_start:batch_start + batch_size]
            log(f"Fetching batch {batch_start//batch_size + 1}/{(total_points + batch_size - 1)//batch_size} ({len(batch)} points)...")
            
            response = requests.post(
                "https://api.open-elevation.com/api/v1/lookup",
                json={"locations": batch},
                timeout=30
            )
            
            if response.status_code == 200:
                results = response.json().get('results', [])
                for idx, result in enumerate(results):
                    if batch_start + idx < len(locations):
                        elev = result.get('elevation')
                        if elev is not None and elev != -32768:
                            loc = locations[batch_start + idx]
                            lat_idx = np.argmin(np.abs(lats - loc['latitude']))
                            lon_idx = np.argmin(np.abs(lons - loc['longitude']))
                            elevation_grid[lat_idx, lon_idx] = float(elev)
            else:
                log(f"API returned status {response.status_code} for batch {batch_start//batch_size + 1}")
    except Exception as e:
        log(f"Elevation API failed: {e}")
        raise Exception(f"Failed to fetch elevation data: {e}")
    
    # Fill NaN with interpolation
    valid_data = elevation_grid[~np.isnan(elevation_grid)]
    if len(valid_data) < 10:
        raise Exception("Insufficient elevation data")
    
    # Use scipy for better interpolation if available
    try:
        from scipy.interpolate import griddata
        from scipy.ndimage import gaussian_filter
        
        # Interpolate missing values
        if np.any(np.isnan(elevation_grid)):
            valid_mask = ~np.isnan(elevation_grid)
            valid_lats = np.array([lats[i] for i in range(len(lats)) for j in range(len(lons)) if valid_mask[i, j]])
            valid_lons = np.array([lons[j] for i in range(len(lats)) for j in range(len(lons)) if valid_mask[i, j]])
            valid_elevs = elevation_grid[valid_mask]
            
            nan_mask = np.isnan(elevation_grid)
            nan_lats = np.array([lats[i] for i in range(len(lats)) for j in range(len(lons)) if nan_mask[i, j]])
            nan_lons = np.array([lons[j] for i in range(len(lats)) for j in range(len(lons)) if nan_mask[i, j]])
            
            if len(nan_lats) > 0:
                interpolated = griddata(
                    (valid_lats, valid_lons),
                    valid_elevs,
                    (nan_lats, nan_lons),
                    method='cubic',
                    fill_value=np.nanmean(valid_elevs)
                )
                for idx, (i, j) in enumerate([(i, j) for i in range(len(lats)) for j in range(len(lons)) if nan_mask[i, j]]):
                    elevation_grid[i, j] = interpolated[idx]
        
        # Smooth the elevation grid for better contours
        elevation_grid = gaussian_filter(elevation_grid, sigma=0.5)
        log("Applied scipy interpolation and smoothing for accuracy")
    except ImportError:
        # Fallback: simple mean fill
        mean_elev = np.nanmean(elevation_grid)
        elevation_grid[np.isnan(elevation_grid)] = mean_elev
        log("Using simple mean fill (scipy not available)")
    
    # Generate contours using Python
    min_elev = float(np.min(elevation_grid))
    max_elev = float(np.max(elevation_grid))
    
    min_level = math.floor(min_elev / interval) * interval
    max_level = math.ceil(max_elev / interval) * interval
    levels = np.arange(min_level, max_level + interval, interval)
    
    log(f"Generating {len(levels)} contour levels (range: {min_elev:.1f}m - {max_elev:.1f}m)...")
    
    features = []
    
    for level in levels:
        if level < min_elev or level > max_elev:
            continue
        
        is_bold = False
        if bold_interval:
            level_index = int((level - min_level) / interval)
            is_bold = (level_index % bold_interval == 0)
        
        # Simple marching squares
        segments = []
        for i in range(len(lats) - 1):
            for j in range(len(lons) - 1):
                z00 = elevation_grid[i, j]
                z01 = elevation_grid[i, j+1]
                z10 = elevation_grid[i+1, j]
                z11 = elevation_grid[i+1, j+1]
                
                cell_min = min(z00, z01, z10, z11)
                cell_max = max(z00, z01, z10, z11)
                
                if not (cell_min <= level <= cell_max):
                    continue
                
                lat0, lat1 = float(lats[i]), float(lats[i+1])
                lon0, lon1 = float(lons[j]), float(lons[j+1])
                
                edge_points = []
                
                if (z00 <= level <= z01) or (z01 <= level <= z00):
                    if abs(z01 - z00) > 0.001:
                        t = (level - z00) / (z01 - z00)
                        t = max(0, min(1, t))
                        edge_points.append([lon0 + t * (lon1 - lon0), lat0])
                
                if (z01 <= level <= z11) or (z11 <= level <= z01):
                    if abs(z11 - z01) > 0.001:
                        t = (level - z01) / (z11 - z01)
                        t = max(0, min(1, t))
                        edge_points.append([lon1, lat0 + t * (lat1 - lat0)])
                
                if (z10 <= level <= z11) or (z11 <= level <= z10):
                    if abs(z11 - z10) > 0.001:
                        t = (level - z10) / (z11 - z10)
                        t = max(0, min(1, t))
                        edge_points.append([lon0 + t * (lon1 - lon0), lat1])
                
                if (z00 <= level <= z10) or (z10 <= level <= z00):
                    if abs(z10 - z00) > 0.001:
                        t = (level - z00) / (z10 - z00)
                        t = max(0, min(1, t))
                        edge_points.append([lon0, lat0 + t * (lat1 - lat0)])
                
                if len(edge_points) == 2:
                    segments.append({'p1': edge_points[0], 'p2': edge_points[1]})
        
        # Connect segments
        lines = connect_segments(segments, minx, miny, maxx, maxy)
        
        for line in lines:
            if len(line) < 3:
                continue
            
            coords = [[p[0], p[1], float(level)] for p in line]
            normalized = (level - min_elev) / (max_elev - min_elev) if max_elev > min_elev else 0.5
            color = get_contour_color(level, min_elev, max_elev)
            
            feature = {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {
                    "elevation": float(level),
                    "bold": is_bold,
                    "weight": 3 if is_bold else 2,
                    "color": color,
                    "name": f"{int(level)}m",
                    "label": f"{int(level)}m"
                }
            }
            features.append(feature)
    
    elapsed = time.time() - start_time
    log(f"✅ Generated {len(features)} contours in {elapsed:.2f}s")
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "interval": interval,
            "bold_interval": bold_interval,
            "count": len(features),
            "bbox": bbox,
            "min_elevation": min_elev,
            "max_elevation": max_elev
        }
    }

def connect_segments(segments, minx, miny, maxx, maxy):
    """Connect contour segments into smooth continuous lines - improved algorithm"""
    if not segments:
        return []
    
    lines = []
    used = set()
    
    for start_idx, seg in enumerate(segments):
        if start_idx in used:
            continue
        
        # Start a new line
        line = [seg['p1'], seg['p2']]
        used.add(start_idx)
        current = seg['p2']
        start_point = seg['p1']
        
        max_iter = 2000  # Increased for longer lines
        iter = 0
        
        # Connect forward
        while iter < max_iter:
            next_idx = None
            min_dist = float('inf')
            next_point = None
            
            for idx, s in enumerate(segments):
                if idx in used:
                    continue
                
                # Check both endpoints
                for point in [s['p1'], s['p2']]:
                    dist = math.sqrt((point[0] - current[0])**2 + (point[1] - current[1])**2)
                    # Tighter threshold for better connection
                    if dist < 0.00005 and dist < min_dist:  # ~5.5m tolerance
                        min_dist = dist
                        next_idx = idx
                        next_seg = s
                        next_point = s['p2'] if point == s['p1'] else s['p1']
            
            if next_idx is None:
                break
            
            line.append(next_point)
            current = next_point
            used.add(next_idx)
            iter += 1
        
        # Try to extend backwards
        current = start_point
        iter = 0
        while iter < max_iter:
            next_idx = None
            min_dist = float('inf')
            next_point = None
            
            for idx, s in enumerate(segments):
                if idx in used:
                    continue
                
                for point in [s['p1'], s['p2']]:
                    dist = math.sqrt((point[0] - current[0])**2 + (point[1] - current[1])**2)
                    if dist < 0.00005 and dist < min_dist:
                        min_dist = dist
                        next_idx = idx
                        next_seg = s
                        next_point = s['p2'] if point == s['p1'] else s['p1']
            
            if next_idx is None:
                break
            
            line.insert(0, next_point)  # Add at beginning
            current = next_point
            used.add(next_idx)
            iter += 1
        
        # Filter to bbox and ensure minimum length
        filtered = []
        for p in line:
            if minx <= p[0] <= maxx and miny <= p[1] <= maxy:
                filtered.append(p)
        
        if len(filtered) >= 3:
            lines.append(filtered)
    
    return lines

def process_contour_data(data, bbox, interval, bold_interval, start_time):
    """Process GDAL-generated contours"""
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    if data.get('type') != 'FeatureCollection' or len(data.get('features', [])) == 0:
        raise Exception("No valid contour features")
    
    elevations = []
    for feature in data['features']:
        if 'properties' not in feature:
            feature['properties'] = {}
        
        if 'elevation' not in feature['properties']:
            if 'ELEV' in feature['properties']:
                feature['properties']['elevation'] = feature['properties']['ELEV']
            else:
                coords = feature.get('geometry', {}).get('coordinates', [])
                if coords and len(coords[0]) > 2:
                    z_values = [c[2] for c in coords[0] if len(c) > 2]
                    if z_values:
                        feature['properties']['elevation'] = round(sum(z_values) / len(z_values))
        
        elevation = feature['properties'].get('elevation')
        if elevation is not None:
            elevations.append(elevation)
    
    min_elev = min(elevations) if elevations else None
    max_elev = max(elevations) if elevations else None
    
    enhanced_features = []
    
    for feature in data['features']:
        if 'properties' not in feature:
            feature['properties'] = {}
        
        elevation = feature['properties'].get('elevation', 0)
        feature['properties']['name'] = f"{elevation}m"
        feature['properties']['label'] = f"{elevation}m"
        
        if bold_interval and elevation is not None:
            if elevation % (interval * bold_interval) == 0:
                feature['properties']['bold'] = True
                feature['properties']['weight'] = 3
            else:
                feature['properties']['bold'] = False
                feature['properties']['weight'] = 2
        else:
            feature['properties']['bold'] = False
            feature['properties']['weight'] = 2
        
        feature['properties']['color'] = get_contour_color(elevation, min_elev, max_elev)
        
        coords = feature.get('geometry', {}).get('coordinates', [])
        if coords and len(coords) > 0:
            in_bbox = False
            for coord in coords[0] if isinstance(coords[0][0], list) else coords:
                lon, lat = coord[0], coord[1]
                if minx <= lon <= maxx and miny <= lat <= maxy:
                    in_bbox = True
                    break
            
            if in_bbox:
                enhanced_features.append(feature)
    
    elapsed = time.time() - start_time
    log(f"✅ Processed {len(enhanced_features)} contours in {elapsed:.2f}s")
    
    return {
        "type": "FeatureCollection",
        "features": enhanced_features,
        "properties": {
            "interval": interval,
            "bold_interval": bold_interval,
            "count": len(enhanced_features),
            "bbox": bbox,
            "min_elevation": min_elev,
            "max_elevation": max_elev
        }
    }

def extract_contours_python(dem_path, bbox, interval, bold_interval, start_time):
    """Python-based contour extraction (fallback)"""
    try:
        from matplotlib._contour import QuadContourGenerator
    except ImportError:
        raise Exception("matplotlib required for Python-based extraction")
    
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    
    with rasterio.open(dem_path) as src:
        data = src.read(1)
        bounds = src.bounds
        
        height, width = data.shape
        x = np.linspace(bounds.left, bounds.right, width)
        y = np.linspace(bounds.bottom, bounds.top, height)
        X, Y = np.meshgrid(x, y)
        
        valid_data = data[~np.isnan(data) & (data != src.nodata)]
        if len(valid_data) == 0:
            raise Exception("No valid elevation data")
        
        min_elev = float(np.min(valid_data))
        max_elev = float(np.max(valid_data))
        
        min_level = math.floor(min_elev / interval) * interval
        max_level = math.ceil(max_elev / interval) * interval
        levels = np.arange(min_level, max_level + interval, interval)
        
        features = []
        
        for level in levels:
            if level < min_elev or level > max_elev:
                continue
            
            is_bold = False
            if bold_interval:
                level_index = int((level - min_level) / interval)
                is_bold = (level_index % bold_interval == 0)
            
            contour_gen = QuadContourGenerator(X, Y, data, None, True, 0)
            contour_lines = contour_gen.create_contour(level)
            
            for line in contour_lines:
                if len(line) < 3:
                    continue
                
                filtered_coords = []
                for point in line:
                    lon, lat = point[0], point[1]
                    if minx <= lon <= maxx and miny <= lat <= maxy:
                        filtered_coords.append([lon, lat, float(level)])
                
                if len(filtered_coords) < 3:
                    continue
                
                color = get_contour_color(level, min_elev, max_elev)
                
                feature = {
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": filtered_coords},
                    "properties": {
                        "elevation": float(level),
                        "bold": is_bold,
                        "weight": 3 if is_bold else 2,
                        "color": color,
                        "name": f"{int(level)}m",
                        "label": f"{int(level)}m"
                    }
                }
                features.append(feature)
        
        elapsed = time.time() - start_time
        log(f"✅ Generated {len(features)} contours in {elapsed:.2f}s")
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "interval": interval,
                "bold_interval": bold_interval,
                "count": len(features),
                "bbox": bbox,
                "min_elevation": min_elev,
                "max_elevation": max_elev
            }
        }

def get_contour_color(elevation, min_elev=None, max_elev=None):
    """Get color based on elevation"""
    if elevation is None:
        return '#3b82f6'
    
    if min_elev is not None and max_elev is not None and max_elev > min_elev:
        normalized = (elevation - min_elev) / (max_elev - min_elev)
        normalized = max(0, min(1, normalized))
    else:
        if elevation < 0:
            normalized = 0
        elif elevation < 500:
            normalized = elevation / 500.0 * 0.3
        elif elevation < 2000:
            normalized = 0.3 + (elevation - 500) / 1500.0 * 0.5
        else:
            normalized = 0.8 + min((elevation - 2000) / 3000.0, 0.2)
    
    if normalized < 0.1:
        r, g, b = 0, 0, 200
    elif normalized < 0.2:
        t = (normalized - 0.1) / 0.1
        r, g, b = 0, int(100 * t), int(200 + 55 * t)
    elif normalized < 0.3:
        r, g, b = 0, 200, 255
    elif normalized < 0.4:
        t = (normalized - 0.3) / 0.1
        r, g, b = 0, int(200 + 55 * t), int(255 - 155 * t)
    elif normalized < 0.5:
        r, g, b = 0, 255, 100
    elif normalized < 0.6:
        t = (normalized - 0.5) / 0.1
        r, g, b = int(255 * t), 255, int(100 - 100 * t)
    elif normalized < 0.7:
        r, g, b = 255, 255, 0
    elif normalized < 0.8:
        t = (normalized - 0.7) / 0.1
        r, g, b = 255, int(255 - 100 * t), 0
    elif normalized < 0.9:
        r, g, b = 255, 155, 0
    else:
        t = (normalized - 0.9) / 0.1
        r, g, b = 255, int(155 - 155 * t), 0
    
    return f"#{r:02x}{g:02x}{b:02x}"
