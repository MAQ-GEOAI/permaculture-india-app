# contours.py – Professional contour extraction with India-optimized DEM and enhanced features
import tempfile
import subprocess
import json
import os
import math
import numpy as np
import rasterio
from utils import download_dem

# Simple logging function
def log(msg):
    print(f"[CONTOURS] {msg}")

def generate_contours(bbox, interval=5, bold_interval=None):
    """
    Generate professional contours with enhanced features
    
    Args:
        bbox: "minx,miny,maxx,maxy" bounding box string
        interval: Contour interval in meters (0.5, 1, 2, 5, 10, 20, 50, 100)
        bold_interval: Every Nth contour to make bold (e.g., 5 = every 5th contour is bold)
    
    Returns:
        GeoJSON FeatureCollection with contours, including bold contours
    """
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    center_lat = (miny + maxy) / 2
    center_lon = (minx + maxx) / 2
    
    # Calculate bounding box for DEM download (slightly larger for edge cases)
    buffer = 0.01  # ~1km buffer
    dem_bbox = (
        minx - buffer,
        miny - buffer,
        maxx + buffer,
        maxy + buffer
    )

    # Download DEM with multiple tiles merged for better coverage
    dem_path = None
    dem_error = None
    
    try:
        dem_path = download_dem(center_lat, center_lon, bbox=dem_bbox)
        
        # CRITICAL: Verify DEM has valid, varying elevation data (not uniform)
        if dem_path and os.path.exists(dem_path):
            with rasterio.open(dem_path) as src:
                data = src.read(1)
                valid_data = data[(data != src.nodata) & (data != 0) & ~np.isnan(data)]
                
                if len(valid_data) == 0:
                    raise Exception("DEM contains no valid elevation data")
                
                # Check if data actually varies (not uniform - this is the key issue!)
                data_std = np.std(valid_data)
                data_range = np.max(valid_data) - np.min(valid_data)
                
                if data_std < 0.5 or data_range < 1.0:
                    raise Exception(f"DEM data is uniform/invalid (std={data_std:.2f}m, range={data_range:.2f}m) - not real terrain")
                
                log(f"DEM validated: {len(valid_data)} valid points, elevation range {np.min(valid_data):.1f}m - {np.max(valid_data):.1f}m, std={data_std:.2f}m")
                
    except Exception as e:
        dem_error = str(e)
        log(f"DEM download/validation failed: {dem_error}")
        raise Exception(f"Cannot generate real terrain contours. DEM validation failed: {dem_error}. Please ensure elevation data sources are accessible and contain real terrain variation.")

    with tempfile.NamedTemporaryFile(suffix=".geojson", delete=False) as tmp:
        out = tmp.name
        
        # Use gdal_contour with enhanced options for professional output
        cmd = [
            "gdal_contour",
            "-i", str(interval),  # Contour interval in meters
            "-f", "GeoJSON",
            "-a", "elevation",  # Attribute name for elevation
            "-3d",  # Include 3D coordinates (Z values)
            "-snodata", "-32768",  # Handle no-data values
            dem_path,
            out
        ]
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
            
            with open(out) as f:
                data = json.load(f)
            
            # Clean up temp file
            try:
                os.unlink(out)
            except:
                pass
            
            # Validate and enhance contour data
            if data.get('type') == 'FeatureCollection' and len(data.get('features', [])) > 0:
                # First pass: collect all elevations for color normalization
                elevations = []
                for feature in data['features']:
                    if 'properties' not in feature:
                        feature['properties'] = {}
                    
                    # Extract elevation
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
                
                # Calculate min/max for color normalization
                min_elev = min(elevations) if elevations else None
                max_elev = max(elevations) if elevations else None
                
                # Process and enhance each contour feature
                enhanced_features = []
                
                for feature in data['features']:
                    if 'properties' not in feature:
                        feature['properties'] = {}
                    
                    # Ensure elevation property exists
                    if 'elevation' not in feature['properties']:
                        if 'ELEV' in feature['properties']:
                            feature['properties']['elevation'] = feature['properties']['ELEV']
                        else:
                            # Try to extract from geometry Z coordinate
                            coords = feature.get('geometry', {}).get('coordinates', [])
                            if coords and len(coords[0]) > 2:
                                # Average Z values for this line
                                z_values = [c[2] for c in coords[0] if len(c) > 2]
                                if z_values:
                                    feature['properties']['elevation'] = round(sum(z_values) / len(z_values))
                    
                    # Add name/label
                    elevation = feature['properties'].get('elevation', 0)
                    feature['properties']['name'] = f"{elevation}m"
                    feature['properties']['label'] = f"{elevation}m"
                    
                    # Determine if this is a bold contour
                    if bold_interval and elevation is not None:
                        # Check if this elevation is a multiple of bold_interval
                        if elevation % (interval * bold_interval) == 0:
                            feature['properties']['bold'] = True
                            feature['properties']['weight'] = 2.5  # Thicker line
                        else:
                            feature['properties']['bold'] = False
                            feature['properties']['weight'] = 1
                    else:
                        feature['properties']['bold'] = False
                        feature['properties']['weight'] = 1
                    
                    # Add color based on elevation with normalization (professional gradient)
                    feature['properties']['color'] = get_contour_color(elevation, min_elev, max_elev)
                    
                    # Filter contours within bounding box
                    coords = feature.get('geometry', {}).get('coordinates', [])
                    if coords and len(coords) > 0:
                        # Check if any coordinate is within bbox
                        in_bbox = False
                        for coord in coords[0] if isinstance(coords[0][0], list) else coords:
                            lon, lat = coord[0], coord[1]
                            if minx <= lon <= maxx and miny <= lat <= maxy:
                                in_bbox = True
                                break
                        
                        if in_bbox:
                            enhanced_features.append(feature)
                
                # Update feature collection
                data['features'] = enhanced_features
                data['properties'] = {
                    'interval': interval,
                    'bold_interval': bold_interval,
                    'count': len(enhanced_features),
                    'bbox': bbox,
                    'min_elevation': min_elev,
                    'max_elevation': max_elev
                }
                
                if len(enhanced_features) == 0:
                    raise Exception("No contours found within bounding box")
                
                return data
            else:
                raise Exception("No valid contour features generated")
                
        except subprocess.TimeoutExpired:
            try:
                os.unlink(out)
            except:
                pass
            raise Exception("Contour generation timed out (may be too large area)")
        except subprocess.CalledProcessError as e:
            # Clean up on error
            try:
                os.unlink(out)
            except:
                pass
            error_msg = e.stderr if e.stderr else str(e)
            raise Exception(f"GDAL contour generation failed: {error_msg}")

def get_contour_color(elevation, min_elev=None, max_elev=None):
    """
    Get color for contour based on elevation with professional gradient
    Similar to contourmap.app - blue (low) to red (high)
    """
    if elevation is None:
        return '#3b82f6'  # Default blue
    
    # Normalize elevation if min/max provided
    if min_elev is not None and max_elev is not None and max_elev > min_elev:
        normalized = (elevation - min_elev) / (max_elev - min_elev)
        normalized = max(0, min(1, normalized))  # Clamp to 0-1
    else:
        # Use absolute elevation ranges
        if elevation < 0:
            normalized = 0
        elif elevation < 500:
            normalized = elevation / 500.0 * 0.3  # 0-0.3 for 0-500m
        elif elevation < 2000:
            normalized = 0.3 + (elevation - 500) / 1500.0 * 0.5  # 0.3-0.8 for 500-2000m
        else:
            normalized = 0.8 + min((elevation - 2000) / 3000.0, 0.2)  # 0.8-1.0 for 2000m+
    
    # Color gradient: Blue -> Cyan -> Green -> Yellow -> Orange -> Red
    # Similar to contourmap.app color scheme
    if normalized < 0.2:
        # Blue to Cyan (low elevations)
        r = int(0 + (normalized / 0.2) * 0)
        g = int(100 + (normalized / 0.2) * 155)
        b = int(200 + (normalized / 0.2) * 55)
    elif normalized < 0.4:
        # Cyan to Green
        t = (normalized - 0.2) / 0.2
        r = int(0)
        g = int(255)
        b = int(255 - t * 155)
    elif normalized < 0.6:
        # Green to Yellow
        t = (normalized - 0.4) / 0.2
        r = int(0 + t * 255)
        g = int(255)
        b = int(100 - t * 100)
    elif normalized < 0.8:
        # Yellow to Orange
        t = (normalized - 0.6) / 0.2
        r = int(255)
        g = int(255 - t * 100)
        b = int(0)
    else:
        # Orange to Red
        t = (normalized - 0.8) / 0.2
        r = int(255)
        g = int(155 - t * 155)
        b = int(0)
    
    return f"#{r:02x}{g:02x}{b:02x}"
