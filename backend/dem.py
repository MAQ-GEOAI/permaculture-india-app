# dem.py – DEM extraction utilities
import rasterio
import numpy as np
from utils import download_dem

def get_dem_stats(lat, lon):
    dem_path = download_dem(lat, lon)
    with rasterio.open(dem_path) as dem:
        value = list(dem.sample([(lon, lat)]))[0][0]
    return {"lat": lat, "lon": lon, "elevation_m": float(value)}

def get_dem_tile(bbox):
    # bbox format: "minLon,minLat,maxLon,maxLat"
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    dem_path = download_dem((miny + maxy)/2, (minx + maxx)/2)

    with rasterio.open(dem_path) as dem:
        window = dem.window(minx, miny, maxx, maxy)
        arr = dem.read(1, window=window)

    return {"bbox": bbox, "elevation_grid": arr.tolist()}
