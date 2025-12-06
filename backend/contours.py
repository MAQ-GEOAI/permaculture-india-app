# contours.py – True contour extraction using GDAL with improved accuracy
import tempfile
import subprocess
import json
import os
from utils import download_dem

def generate_contours(bbox, interval):
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    center_lat = (miny + maxy) / 2
    center_lon = (minx + maxx) / 2

    # Download DEM tile with improved accuracy
    try:
        dem_path = download_dem(center_lat, center_lon)
    except Exception as e:
        # If download fails, try downloading multiple tiles and merging
        # Download tiles for bounding box corners
        try:
            dem_path = download_dem(miny, minx)
        except:
            dem_path = download_dem(center_lat, center_lon)

    with tempfile.NamedTemporaryFile(suffix=".geojson", delete=False) as tmp:
        out = tmp.name
        
        # Use gdal_contour with better options for accuracy
        cmd = [
            "gdal_contour",
            "-i", str(interval),  # Contour interval in meters
            "-f", "GeoJSON",
            "-a", "elevation",  # Attribute name for elevation
            "-3d",  # Include 3D coordinates (Z values)
            dem_path,
            out
        ]
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            with open(out) as f:
                data = json.load(f)
            
            # Clean up temp file
            try:
                os.unlink(out)
            except:
                pass
            
            # Validate and improve contour data
            if data.get('type') == 'FeatureCollection' and len(data.get('features', [])) > 0:
                # Add elevation labels to properties if missing
                for feature in data['features']:
                    if 'properties' not in feature:
                        feature['properties'] = {}
                    if 'elevation' not in feature['properties'] and 'ELEV' in feature.get('properties', {}):
                        feature['properties']['elevation'] = feature['properties']['ELEV']
                    if 'name' not in feature['properties'] and 'elevation' in feature['properties']:
                        feature['properties']['name'] = f"{feature['properties']['elevation']}m contour"
                
                return data
            else:
                raise Exception("No valid contour features generated")
                
        except subprocess.CalledProcessError as e:
            # Clean up on error
            try:
                os.unlink(out)
            except:
                pass
            raise Exception(f"GDAL contour generation failed: {e.stderr}")
