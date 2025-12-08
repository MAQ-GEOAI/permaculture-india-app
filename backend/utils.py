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
        
        # If no tiles downloaded, try elevation API as fallback
        if not tiles:
            try:
                from elevation_api import create_dem_from_api
                print("[UTILS] No DEM tiles available, using OpenElevation API...")
                return create_dem_from_api(bbox, resolution=30)
            except Exception as e:
                raise Exception(f"Failed to download DEM tiles and elevation API failed: {str(e)}")
        
        # Merge tiles if multiple
        if len(tiles) == 1:
            return tiles[0]
        else:
            return merge_dem_tiles(tiles, bbox)
    
    # Single tile download
    tile_path = download_single_dem_tile(int(lat), int(lon), is_india)
    
    # If single tile fails, try elevation API for small area
    if not tile_path:
        try:
            from elevation_api import create_dem_from_api
            # Create small bbox around point
            buffer = 0.01  # ~1km
            bbox = (lon - buffer, lat - buffer, lon + buffer, lat + buffer)
            return create_dem_from_api(bbox, resolution=30)
        except:
            raise Exception(f"Failed to download DEM tile for lat={lat}, lon={lon}")
    
    return tile_path

def download_single_dem_tile(tile_lat, tile_lon, is_india=False):
    """Download a single DEM tile with improved sources"""
    tile = f"{tile_lat}_{tile_lon}.tif"
    path = f"{DEM_FOLDER}/{tile}"

    if os.path.exists(path):
        return path

    # Priority sources for India - improved order
    if is_india:
        sources = [
            # Source 1: AWS SRTM Skadi (30m, most reliable)
            {
                'url': f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{tile_lat}_{tile_lon}.tif",
                'type': 'tif'
            },
            # Source 2: Alternative AWS endpoint
            {
                'url': f"https://elevation-tiles-prod.s3.amazonaws.com/skadi/{tile_lat}_{tile_lon}.tif",
                'type': 'tif'
            },
            # Source 3: OpenTopoMap DEM (good quality)
            {
                'url': f"https://opentopomap.org/dem/{tile_lat}_{tile_lon}.tif",
                'type': 'tif'
            },
            # Source 4: SRTM via MapTiler (if available)
            {
                'url': f"https://api.maptiler.com/tiles/terrain-rgb/{tile_lat}/{tile_lon}.png?key=free",
                'type': 'terrain-rgb'
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
            url = source['url']
            source_type = source.get('type', 'tif')
            
            r = requests.get(url, timeout=20, headers={'User-Agent': 'Permaculture-App/1.0'})
            if r.status_code == 200 and len(r.content) > 1000:
                with open(path, "wb") as f:
                    f.write(r.content)
                
                # Verify it's a valid GeoTIFF
                try:
                    with rasterio.open(path) as src:
                        if src.count > 0 and src.width > 0 and src.height > 0:
                            # Check if data is valid (not all zeros or nodata)
                            data = src.read(1)
                            if np.any(data != src.nodata) and np.any(data != 0):
                                return path
                except Exception as e:
                    if os.path.exists(path):
                        os.remove(path)
                    continue
        except Exception as e:
            continue
    
    # If all sources fail, return None (caller will handle)
    return None

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
