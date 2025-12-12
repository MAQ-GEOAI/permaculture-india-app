# slope_aspect.py – Generate slope and aspect from DEM
import numpy as np
import rasterio
from rasterio.transform import from_bounds
import json
from utils import download_dem

def generate_slope_aspect(bbox):
    """
    Generate slope and aspect rasters from DEM
    
    Args:
        bbox: "minx,miny,maxx,maxy" bounding box string
    
    Returns:
        dict with 'slope' and 'aspect' GeoJSON FeatureCollections
    """
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    center_lat = (miny + maxy) / 2
    center_lon = (minx + maxx) / 2
    
    # Download DEM
    buffer = 0.01
    dem_bbox = (minx - buffer, miny - buffer, maxx + buffer, maxy + buffer)
    dem_path = download_dem(center_lat, center_lon, bbox=dem_bbox)
    
    if not dem_path:
        raise Exception("Failed to download DEM")
    
    with rasterio.open(dem_path) as src:
        dem_data = src.read(1)
        transform = src.transform
        crs = src.crs
        
        # Calculate slope and aspect using numpy gradients
        # Get pixel size in meters (approximate)
        pixel_size_x = abs(transform[0]) * 111320  # degrees to meters
        pixel_size_y = abs(transform[4]) * 111320
        
        # Calculate gradients
        dy, dx = np.gradient(dem_data, pixel_size_y, pixel_size_x)
        
        # Calculate slope (in degrees)
        slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
        slope_deg = np.degrees(slope_rad)
        
        # Calculate aspect (in degrees, 0-360)
        aspect_rad = np.arctan2(-dx, dy)
        aspect_deg = np.degrees(aspect_rad)
        aspect_deg = np.where(aspect_deg < 0, aspect_deg + 360, aspect_deg)
        
        # Convert to GeoJSON (simplified - return as classified polygons)
        # For web display, we'll return classified zones
        slope_features = classify_slope(slope_deg, minx, miny, maxx, maxy, transform)
        aspect_features = classify_aspect(aspect_deg, minx, miny, maxx, maxy, transform)
        
        return {
            'slope': {
                'type': 'FeatureCollection',
                'features': slope_features
            },
            'aspect': {
                'type': 'FeatureCollection',
                'features': aspect_features
            }
        }

def classify_slope(slope_array, minx, miny, maxx, maxy, transform):
    """Classify slope into categories"""
    # Slope categories: 0-5° (flat), 5-15° (gentle), 15-30° (moderate), 30-45° (steep), >45° (very steep)
    categories = {
        'flat': (0, 5, '#90EE90'),      # Light green
        'gentle': (5, 15, '#FFD700'),   # Gold
        'moderate': (15, 30, '#FF8C00'), # Dark orange
        'steep': (30, 45, '#FF4500'),    # Red orange
        'very_steep': (45, 90, '#8B0000') # Dark red
    }
    
    features = []
    height, width = slope_array.shape
    
    # Sample every 10th pixel for performance
    step = max(1, min(10, width // 50))
    
    for i in range(0, height, step):
        for j in range(0, width, step):
            slope_val = slope_array[i, j]
            if np.isnan(slope_val) or slope_val < 0:
                continue
            
            # Determine category
            category = 'flat'
            color = categories['flat'][2]
            for cat_name, (min_val, max_val, cat_color) in categories.items():
                if min_val <= slope_val < max_val:
                    category = cat_name
                    color = cat_color
                    break
            
            # Convert pixel to lat/lon
            lon, lat = rasterio.transform.xy(transform, i, j)
            
            if minx <= lon <= maxx and miny <= lat <= maxy:
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [lon, lat]
                    },
                    'properties': {
                        'slope': round(float(slope_val), 1),
                        'category': category,
                        'color': color
                    }
                })
    
    return features

def classify_aspect(aspect_array, minx, miny, maxx, maxy, transform):
    """Classify aspect into cardinal directions"""
    # Aspect categories: N, NE, E, SE, S, SW, W, NW
    categories = {
        'N': (337.5, 22.5, '#FF0000'),    # Red
        'NE': (22.5, 67.5, '#FF7F00'),    # Orange
        'E': (67.5, 112.5, '#FFFF00'),    # Yellow
        'SE': (112.5, 157.5, '#7FFF00'),  # Yellow-green
        'S': (157.5, 202.5, '#00FF00'),   # Green
        'SW': (202.5, 247.5, '#007FFF'),  # Cyan-blue
        'W': (247.5, 292.5, '#0000FF'),   # Blue
        'NW': (292.5, 337.5, '#7F00FF')   # Purple
    }
    
    features = []
    height, width = aspect_array.shape
    
    step = max(1, min(10, width // 50))
    
    for i in range(0, height, step):
        for j in range(0, width, step):
            aspect_val = aspect_array[i, j]
            if np.isnan(aspect_val):
                continue
            
            # Determine category (handle wrap-around for North)
            category = 'N'
            color = categories['N'][2]
            for cat_name, (min_val, max_val, cat_color) in categories.items():
                if cat_name == 'N':
                    if aspect_val >= min_val or aspect_val < max_val:
                        category = cat_name
                        color = cat_color
                        break
                elif min_val <= aspect_val < max_val:
                    category = cat_name
                    color = cat_color
                    break
            
            lon, lat = rasterio.transform.xy(transform, i, j)
            
            if minx <= lon <= maxx and miny <= lat <= maxy:
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [lon, lat]
                    },
                    'properties': {
                        'aspect': round(float(aspect_val), 1),
                        'direction': category,
                        'color': color
                    }
                })
    
    return features

