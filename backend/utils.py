# utils.py – Utility functions for DEM handling
import os
import requests
import rasterio
from rasterio.merge import merge
import time

DEM_FOLDER = "data/dem_tiles"
os.makedirs(DEM_FOLDER, exist_ok=True)

# Improved DEM downloader with multiple fallback sources for better accuracy
def download_dem(lat, lon):
    tile = f"{lat:.2f}_{lon:.2f}.tif"
    path = f"{DEM_FOLDER}/{tile}"

    if os.path.exists(path):
        return path

    # Try multiple elevation data sources for better accuracy
    sources = [
        # Source 1: AWS SRTM (Skadi format - high resolution)
        f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{int(lat)}_{int(lon)}.tif",
        # Source 2: NASA SRTM (alternative format)
        f"https://elevation-tiles-prod.s3.amazonaws.com/skadi/{int(lat)}_{int(lon)}.tif",
        # Source 3: OpenTopoMap DEM (if available)
        f"https://opentopomap.org/dem/{int(lat)}_{int(lon)}.tif",
    ]
    
    for url in sources:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200 and len(r.content) > 1000:  # Ensure we got actual data
                with open(path, "wb") as f:
                    f.write(r.content)
                # Verify it's a valid GeoTIFF
                try:
                    with rasterio.open(path) as src:
                        if src.count > 0:
                            return path
                except:
                    os.remove(path)
                    continue
        except Exception as e:
            continue
    
    # If all sources fail, raise exception
    raise Exception(f"DEM download failed for lat={lat}, lon={lon}. Tried {len(sources)} sources.")
