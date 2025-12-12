# hydro.py – Hydrology computation backend
import os
import json
from utils import download_dem

# Try to import whitebox, but make it optional
try:
    import whitebox
    WHITEBOX_AVAILABLE = True
except ImportError:
    WHITEBOX_AVAILABLE = False
    print("[HYDRO] Warning: whitebox not available, using simplified hydrology")

def run_hydrology(bbox):
    """
    Generate hydrology data (catchments, flow accumulation, natural ponds)
    Uses whitebox if available, otherwise returns simplified data
    """
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    center_lat = (miny + maxy) / 2
    center_lon = (minx + maxx) / 2
    
    # Download DEM
    dem_path = download_dem(center_lat, center_lon, bbox=(minx, miny, maxx, maxy))
    
    if not dem_path or not os.path.exists(dem_path):
        raise Exception("Failed to download DEM for hydrology analysis")
    
    # Use whitebox if available
    if WHITEBOX_AVAILABLE:
        try:
            wbt = whitebox.WhiteboxTools()
            wbt.work_dir = "/tmp"

            filled = "/tmp/filled.tif"
            flowdir = "/tmp/flowdir.tif"
            flowacc = "/tmp/flowacc.tif"
            streams = "/tmp/streams.tif"
            streams_vec = "/tmp/streams.geojson"

            wbt.fill_depressions(dem_path, filled)
            wbt.d8_pointer(filled, flowdir)
            wbt.d8_flow_accumulation(flowdir, flowacc, out_type="cells")
            wbt.extract_streams(flowacc, streams, threshold=100)
            wbt.raster_streams_to_vector(streams, flowdir, streams_vec)

            if os.path.exists(streams_vec):
                return json.load(open(streams_vec))
        except Exception as e:
            print(f"[HYDRO] Whitebox processing failed: {e}, using simplified approach")
    
    # Simplified hydrology (fallback when whitebox not available)
    # Generate basic flow lines based on DEM slope
    import numpy as np
    import rasterio
    
    with rasterio.open(dem_path) as src:
        dem_data = src.read(1)
        transform = src.transform
        height, width = dem_data.shape
        
        # Simple flow direction calculation
        features = []
        
        # Sample grid for flow lines
        step = max(1, min(20, width // 50))
        
        for i in range(0, height, step):
            for j in range(0, width, step):
                if i + 1 >= height or j + 1 >= width:
                    continue
                
                # Calculate local slope direction
                z = dem_data[i, j]
                z_right = dem_data[i, j + 1] if j + 1 < width else z
                z_down = dem_data[i + 1, j] if i + 1 < height else z
                
                # Determine flow direction
                if z_right < z and z_down < z:
                    # Flow to lower elevation
                    lon1, lat1 = rasterio.transform.xy(transform, i, j)
                    lon2, lat2 = rasterio.transform.xy(transform, i + 1, j + 1)
                    
                    # Check if within bbox
                    if minx <= lon1 <= maxx and miny <= lat1 <= maxy:
                        features.append({
                            'type': 'Feature',
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': [[lon1, lat1], [lon2, lat2]]
                            },
                            'properties': {
                                'type': 'flow',
                                'elevation': float(z)
                            }
                        })
        
        # Create catchments (simplified - based on elevation)
        catchments = []
        for i in range(0, height, step * 2):
            for j in range(0, width, step * 2):
                lon, lat = rasterio.transform.xy(transform, i, j)
                if minx <= lon <= maxx and miny <= lat <= maxy:
                    z = dem_data[i, j]
                    # Low areas = potential catchments
                    if z < np.percentile(dem_data[~np.isnan(dem_data)], 30):
                        catchments.append({
                            'type': 'Feature',
                            'geometry': {
                                'type': 'Point',
                                'coordinates': [lon, lat]
                            },
                            'properties': {
                                'type': 'catchment',
                                'elevation': float(z)
                            }
                        })
        
        return {
            'type': 'FeatureCollection',
            'features': features + catchments,
            'properties': {
                'source': 'simplified',
                'note': 'Whitebox not available, using simplified hydrology'
            }
        }
