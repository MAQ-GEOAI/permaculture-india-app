# elevation_api.py – Direct elevation API integration for accurate contours
import requests
import numpy as np
import rasterio
from rasterio.transform import from_bounds
import tempfile
import os
import time

def get_elevation_from_api(lat, lon):
    """
    Get elevation from OpenElevation API (free, no key required)
    Returns elevation in meters
    """
    try:
        # OpenElevation API - free, no key needed, supports batch
        url = "https://api.open-elevation.com/api/v1/lookup"
        payload = {
            "locations": [{"latitude": lat, "longitude": lon}]
        }
        response = requests.post(url, json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data.get('results') and len(data['results']) > 0:
                elevation = data['results'][0].get('elevation')
                if elevation is not None and elevation != -32768:  # Invalid marker
                    return elevation
    except Exception as e:
        pass
    
    return None

def get_elevations_batch(locations):
    """
    Get elevations for multiple locations in batch
    locations: list of [lat, lon] pairs
    """
    try:
        url = "https://api.open-elevation.com/api/v1/lookup"
        payload = {
            "locations": [{"latitude": lat, "longitude": lon} for lat, lon in locations]
        }
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            elevations = []
            for result in data.get('results', []):
                elev = result.get('elevation')
                if elev is not None and elev != -32768:
                    elevations.append(elev)
                else:
                    elevations.append(None)
            return elevations
    except Exception as e:
        pass
    
    return [None] * len(locations)

def create_dem_from_api(bbox, resolution=30):
    """
    Create DEM raster from elevation API calls
    bbox: (minx, miny, maxx, maxy) in degrees
    resolution: target resolution in meters
    Returns path to temporary GeoTIFF file
    """
    minx, miny, maxx, maxy = bbox
    
    # Calculate approximate grid size
    # 1 degree ≈ 111,320 meters at equator
    width_m = (maxx - minx) * 111320 * np.cos(np.radians((miny + maxy) / 2))
    height_m = (maxy - miny) * 111320
    
    cols = max(10, min(100, int(width_m / resolution) + 1))  # Limit to 100x100 max
    rows = max(10, min(100, int(height_m / resolution) + 1))
    
    # Adjust resolution if grid is too large
    if cols > 100 or rows > 100:
        resolution = max(width_m / 100, height_m / 100)
        cols = max(10, min(100, int(width_m / resolution) + 1))
        rows = max(10, min(100, int(height_m / resolution) + 1))
    
    # Create elevation grid
    elevation_grid = np.full((rows, cols), np.nan, dtype=np.float32)
    
    # Calculate step sizes
    lat_step = (maxy - miny) / (rows - 1) if rows > 1 else 0
    lon_step = (maxx - minx) / (cols - 1) if cols > 1 else 0
    
    # Prepare batch request
    locations = []
    grid_indices = []
    
    for i in range(rows):
        for j in range(cols):
            lat = miny + i * lat_step
            lon = minx + j * lon_step
            locations.append([lat, lon])
            grid_indices.append((i, j))
    
    # Get elevations in batch
    print(f"[ELEVATION_API] Requesting {len(locations)} elevation points...")
    elevations = get_elevations_batch(locations)
    
    # Fill grid
    valid_count = 0
    for idx, (i, j) in enumerate(grid_indices):
        if elevations[idx] is not None:
            elevation_grid[i, j] = elevations[idx]
            valid_count += 1
    
    if valid_count == 0:
        raise Exception("No valid elevation data retrieved from API")
    
    print(f"[ELEVATION_API] Retrieved {valid_count}/{len(locations)} elevation points")
    
    # Interpolate missing values using nearest neighbor
    from scipy import ndimage
    try:
        # Fill NaN values with nearest valid value
        mask = ~np.isnan(elevation_grid)
        if np.any(mask):
            elevation_grid = ndimage.generic_filter(
                elevation_grid,
                lambda x: x[~np.isnan(x)][0] if np.any(~np.isnan(x)) else np.nan,
                size=3,
                mode='nearest'
            )
            # Final fill with mean if still NaN
            if np.any(np.isnan(elevation_grid)):
                mean_elev = np.nanmean(elevation_grid)
                elevation_grid[np.isnan(elevation_grid)] = mean_elev
    except:
        # If scipy not available, use simple mean fill
        mean_elev = np.nanmean(elevation_grid)
        elevation_grid[np.isnan(elevation_grid)] = mean_elev
    
    # Create GeoTIFF from grid
    transform = from_bounds(minx, miny, maxx, maxy, cols, rows)
    
    temp_file = tempfile.NamedTemporaryFile(suffix='.tif', delete=False)
    temp_path = temp_file.name
    temp_file.close()
    
    with rasterio.open(
        temp_path,
        'w',
        driver='GTiff',
        height=rows,
        width=cols,
        count=1,
        dtype=elevation_grid.dtype,
        crs='EPSG:4326',
        transform=transform,
        compress='lzw',
        nodata=np.nan
    ) as dst:
        dst.write(elevation_grid, 1)
    
    return temp_path
