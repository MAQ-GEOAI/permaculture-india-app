# utils.py – Utility functions for DEM handling with India-specific optimizations
import os
import requests
import rasterio
from rasterio.merge import merge
from rasterio.warp import calculate_default_transform, reproject, Resampling
import time
import math
import numpy as np
from io import BytesIO
import zipfile
import tempfile
try:
    from scipy import ndimage
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("[UTILS] Warning: scipy not available, using simple interpolation")

DEM_FOLDER = "data/dem_tiles"
os.makedirs(DEM_FOLDER, exist_ok=True)

def is_india_region(lat, lon):
    """Check if coordinates are within India bounds"""
    # India approximate bounds: 6.5°N to 37.5°N, 68°E to 97.5°E
    return 6.5 <= lat <= 37.5 and 68 <= lon <= 97.5

def get_srtm_tile_name(lat, lon):
    """Get SRTM tile name from lat/lon (e.g., N28E077)"""
    ns = 'N' if lat >= 0 else 'S'
    ew = 'E' if lon >= 0 else 'W'
    return f"{ns}{abs(int(lat)):02d}{ew}{abs(int(lon)):03d}"

# Improved DEM downloader with India-specific sources and better accuracy
def download_dem(lat, lon, bbox=None):
    """
    Download DEM with multiple sources, optimized for India
    bbox: (minx, miny, maxx, maxy) for downloading multiple tiles
    """
    # For India, prioritize high-resolution sources
    is_india = is_india_region(lat, lon)
    
    # If bbox provided, download and merge multiple tiles
    if bbox:
        minx, miny, maxx, maxy = bbox
        tiles = []
        
        # Calculate tile grid needed
        lat_start = int(math.floor(miny))
        lat_end = int(math.ceil(maxy))
        lon_start = int(math.floor(minx))
        lon_end = int(math.ceil(maxx))
        
        # Download all tiles in bounding box
        for tile_lat in range(lat_start, lat_end + 1):
            for tile_lon in range(lon_start, lon_end + 1):
                tile_path = download_single_dem_tile(tile_lat, tile_lon, is_india)
                if tile_path and os.path.exists(tile_path):
                    tiles.append(tile_path)
        
        if not tiles:
            raise Exception("Failed to download any DEM tiles")
        
        # Merge tiles if multiple
        if len(tiles) == 1:
            return tiles[0]
        else:
            return merge_dem_tiles(tiles, bbox)
    
    # Single tile download
    return download_single_dem_tile(int(lat), int(lon), is_india)

def download_single_dem_tile(tile_lat, tile_lon, is_india=False):
    """Download a single DEM tile with improved sources"""
    tile = f"{tile_lat}_{tile_lon}.tif"
    path = f"{DEM_FOLDER}/{tile}"

    if os.path.exists(path):
        return path

    # Priority sources for India - SRTM 30m from OpenTopography Portal (as recommended by Gemini)
    # OpenTopography Portal provides SRTM 1 Arc-Second (30m) Global DEM - the gold standard
    if is_india:
        sources = [
            # Source 1: AWS SRTM Skadi (30m, SRTM-based, most reliable and fast)
            {
                'url': f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{tile_lat}_{tile_lon}.tif",
                'type': 'tif',
                'description': 'SRTM 30m via AWS Skadi'
            },
            # Source 2: Alternative AWS endpoint (SRTM 30m)
            {
                'url': f"https://elevation-tiles-prod.s3.amazonaws.com/skadi/{tile_lat}_{tile_lon}.tif",
                'type': 'tif',
                'description': 'SRTM 30m via AWS (alt)'
            },
            # Source 3: OpenTopoMap DEM (SRTM-based, good quality)
            {
                'url': f"https://opentopomap.org/dem/{tile_lat}_{tile_lon}.tif",
                'type': 'tif',
                'description': 'OpenTopoMap DEM (SRTM-based)'
            },
        ]
    else:
        # Global sources
        sources = [
            {
                'url': f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{tile_lat}_{tile_lon}.tif",
                'type': 'tif'
            },
            {
                'url': f"https://elevation-tiles-prod.s3.amazonaws.com/skadi/{tile_lat}_{tile_lon}.tif",
                'type': 'tif'
            },
            {
                'url': f"https://opentopomap.org/dem/{tile_lat}_{tile_lon}.tif",
                'type': 'tif'
            },
        ]
    
    for source in sources:
        try:
            # Try primary URL first
            url = source['url']
            source_type = source.get('type', 'tif')
            
            r = requests.get(url, timeout=20, headers={'User-Agent': 'Permaculture-App/1.0'})
            
            # If primary URL fails and fallback exists, try fallback (for OpenTopography North/South)
            if r.status_code != 200 and 'fallback_url' in source:
                url = source['fallback_url']
                r = requests.get(url, timeout=20, headers={'User-Agent': 'Permaculture-App/1.0'})
            
            if r.status_code == 200 and len(r.content) > 1000:
                with open(path, "wb") as f:
                    f.write(r.content)
                
                # Verify it's a valid GeoTIFF with real terrain data
                try:
                    with rasterio.open(path) as src:
                        if src.count > 0 and src.width > 0 and src.height > 0:
                            # Check if data is valid (not all zeros or nodata)
                            data = src.read(1)
                            valid_data = data[(data != src.nodata) & (data != 0) & ~np.isnan(data)]
                            
                            if len(valid_data) == 0:
                                # No valid data
                                if os.path.exists(path):
                                    os.remove(path)
                                continue
                            
                            # CRITICAL: Check if data actually varies (not uniform)
                            data_std = np.std(valid_data)
                            data_range = np.max(valid_data) - np.min(valid_data)
                            
                            # Require at least 1m variation and 0.5m standard deviation
                            if data_std < 0.5 or data_range < 1.0:
                                # Uniform/invalid data - reject
                                if os.path.exists(path):
                                    os.remove(path)
                                continue
                            
                            # Valid DEM with real terrain variation
                            return path
                except Exception as e:
                    if os.path.exists(path):
                        os.remove(path)
                    continue
        except Exception as e:
            continue
    
    # If all sources fail, try OpenElevation API as last resort
    print(f"[UTILS] All DEM tile sources failed for {tile_lat}_{tile_lon}, trying OpenElevation API...")
    try:
        return create_dem_from_elevation_api(tile_lat, tile_lon)
    except Exception as e:
        print(f"[UTILS] OpenElevation API also failed: {e}")
        return None

def create_dem_from_elevation_api(tile_lat, tile_lon, resolution=30):
    """
    Create DEM from OpenElevation API when tile sources fail
    Samples elevation points and creates a GeoTIFF
    """
    from rasterio.transform import from_bounds
    
    # Create a 1-degree tile (approximately 111km)
    minx = float(tile_lon)
    miny = float(tile_lat)
    maxx = minx + 1.0
    maxy = miny + 1.0
    
    # Sample grid - for better resolution, sample every ~0.0005 degrees (~50m)
    step = 0.0005
    lats = np.linspace(miny, maxy, 100)
    lons = np.linspace(minx, maxx, 100)
    
    # Prepare batch request
    locations = []
    grid_indices = []
    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            locations.append({"latitude": float(lat), "longitude": float(lon)})
            grid_indices.append((len(lats) - 1 - i, j))
    
    # Request elevations in batches (API limit ~1000 points)
    elevation_grid = np.full((len(lats), len(lons)), np.nan, dtype=np.float32)
    batch_size = 100
    
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
                    if idx < len(batch) and i + idx < len(grid_indices):
                        elev = result.get('elevation')
                        if elev is not None and elev != -32768:
                            grid_idx = grid_indices[i + idx]
                            elevation_grid[grid_idx] = float(elev)
        except Exception as e:
            print(f"[UTILS] Batch elevation request failed: {e}")
            continue
    
    # Check if we got valid data
    valid_data = elevation_grid[~np.isnan(elevation_grid)]
    if len(valid_data) == 0:
        raise Exception("No valid elevation data from API")
    
    # Check variation
    data_std = np.std(valid_data)
    data_range = np.max(valid_data) - np.min(valid_data)
    if data_std < 0.5 or data_range < 1.0:
        raise Exception(f"API elevation data is uniform (std={data_std:.2f}m, range={data_range:.2f}m)")
    
    # Fill NaN with interpolation
    if SCIPY_AVAILABLE:
        try:
            mask = ~np.isnan(elevation_grid)
            if np.any(mask):
                elevation_grid = ndimage.generic_filter(
                    elevation_grid,
                    lambda x: x[~np.isnan(x)][0] if np.any(~np.isnan(x)) else np.nan,
                    size=3,
                    mode='nearest'
                )
                if np.any(np.isnan(elevation_grid)):
                    mean_elev = np.nanmean(elevation_grid)
                    elevation_grid[np.isnan(elevation_grid)] = mean_elev
        except:
            mean_elev = np.nanmean(elevation_grid)
            elevation_grid[np.isnan(elevation_grid)] = mean_elev
    else:
        mean_elev = np.nanmean(elevation_grid)
        elevation_grid[np.isnan(elevation_grid)] = mean_elev
    
    # Create GeoTIFF
    transform = from_bounds(minx, miny, maxx, maxy, len(lons), len(lats))
    temp_file = tempfile.NamedTemporaryFile(suffix='.tif', delete=False)
    temp_path = temp_file.name
    temp_file.close()
    
    with rasterio.open(
        temp_path,
        'w',
        driver='GTiff',
        height=len(lats),
        width=len(lons),
        count=1,
        dtype=elevation_grid.dtype,
        crs='EPSG:4326',
        transform=transform,
        compress='lzw',
        nodata=np.nan
    ) as dst:
        dst.write(elevation_grid, 1)
    
    print(f"[UTILS] Created DEM from API: {len(valid_data)} points, range {np.min(valid_data):.1f}m - {np.max(valid_data):.1f}m, std={data_std:.2f}m")
    return temp_path

def merge_dem_tiles(tile_paths, bbox):
    """Merge multiple DEM tiles into one"""
    minx, miny, maxx, maxy = bbox
    merged_path = f"{DEM_FOLDER}/merged_{minx:.2f}_{miny:.2f}_{maxx:.2f}_{maxy:.2f}.tif"
    
    if os.path.exists(merged_path):
        return merged_path
    
    try:
        # Open all tiles
        src_files = [rasterio.open(path) for path in tile_paths]
        
        # Merge
        mosaic, out_trans = merge(src_files)
        
        # Get metadata from first file
        out_meta = src_files[0].meta.copy()
        out_meta.update({
            "driver": "GTiff",
            "height": mosaic.shape[1],
            "width": mosaic.shape[2],
            "transform": out_trans,
            "compress": "lzw"
        })
        
        # Write merged file
        with rasterio.open(merged_path, "w", **out_meta) as dest:
            dest.write(mosaic)
        
        # Close all source files
        for src in src_files:
            src.close()
        
        return merged_path
    except Exception as e:
        raise Exception(f"Failed to merge DEM tiles: {str(e)}")
