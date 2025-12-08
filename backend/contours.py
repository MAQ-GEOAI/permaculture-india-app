# contours.py – Professional contour extraction with India-optimized DEM and enhanced features
import tempfile
import subprocess
import json
import os
import math
from utils import download_dem

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
    try:
        dem_path = download_dem(center_lat, center_lon, bbox=dem_bbox)
    except Exception as e:
        # Fallback: try single tile
        try:
            dem_path = download_dem(center_lat, center_lon)
        except:
            raise Exception(f"Failed to download DEM: {str(e)}")

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
                            feature['properties']['weight'] = 2  # Thicker line
                        else:
                            feature['properties']['bold'] = False
                            feature['properties']['weight'] = 1
                    else:
                        feature['properties']['bold'] = False
                        feature['properties']['weight'] = 1
                    
                    # Add color based on elevation (optional - for gradient)
                    feature['properties']['color'] = get_contour_color(elevation)
                    
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
                    'bbox': bbox
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

def get_contour_color(elevation):
    """
    Get color for contour based on elevation (gradient from low to high)
    Lower elevations: blue/green, Higher elevations: brown/red
    """
    if elevation is None:
        return '#1e40af'  # Default blue
    
    # Color gradient based on elevation
    if elevation < 100:
        return '#3b82f6'  # Blue (sea level)
    elif elevation < 500:
        return '#10b981'  # Green (lowlands)
    elif elevation < 1000:
        return '#f59e0b'  # Orange (hills)
    elif elevation < 2000:
        return '#ef4444'  # Red (mountains)
    else:
        return '#7c3aed'  # Purple (high mountains)
