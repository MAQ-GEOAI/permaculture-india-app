# utils.py – Utility functions for DEM handling with India-specific optimizations
import os
import requests
import rasterio
from rasterio.merge import merge
from rasterio.warp import calculate_default_transform, reproject, Resampling
import time
import math

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
    """Download a single DEM tile"""
    tile = f"{tile_lat}_{tile_lon}.tif"
    path = f"{DEM_FOLDER}/{tile}"

    if os.path.exists(path):
        return path

    # Priority sources for India
    if is_india:
        sources = [
            # Source 1: SRTM 30m (NASA) - Best for India
            f"https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11/{get_srtm_tile_name(tile_lat, tile_lon)}.SRTMGL1.hgt.zip",
            # Source 2: AWS SRTM (Skadi format - 30m resolution)
            f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{tile_lat}_{tile_lon}.tif",
            # Source 3: NASA SRTM (alternative AWS endpoint)
            f"https://elevation-tiles-prod.s3.amazonaws.com/skadi/{tile_lat}_{tile_lon}.tif",
            # Source 4: ASTER GDEM (30m, good for India)
            f"https://e4ftl01.cr.usgs.gov/ASTT/ASTGTM.003/2000.03.01/ASTGTM2_{get_srtm_tile_name(tile_lat, tile_lon)}.zip",
            # Source 5: OpenTopoMap DEM
            f"https://opentopomap.org/dem/{tile_lat}_{tile_lon}.tif",
        ]
    else:
        # Global sources
        sources = [
            f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{tile_lat}_{tile_lon}.tif",
            f"https://elevation-tiles-prod.s3.amazonaws.com/skadi/{tile_lat}_{tile_lon}.tif",
            f"https://opentopomap.org/dem/{tile_lat}_{tile_lon}.tif",
        ]
    
    for url in sources:
        try:
            # Handle zip files (SRTM HGT format)
            if url.endswith('.zip'):
                # For now, skip zip files (would need zipfile extraction)
                continue
            
            r = requests.get(url, timeout=15, headers={'User-Agent': 'Permaculture-App/1.0'})
            if r.status_code == 200 and len(r.content) > 1000:
                with open(path, "wb") as f:
                    f.write(r.content)
                
                # Verify it's a valid GeoTIFF
                try:
                    with rasterio.open(path) as src:
                        if src.count > 0 and src.width > 0 and src.height > 0:
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
