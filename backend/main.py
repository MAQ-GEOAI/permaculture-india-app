# main.py – FastAPI backend for Permaculture India Pro
import uvicorn
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

from dem import get_dem_stats, get_dem_tile
from contours import generate_contours
from contours_fast import generate_contours_fast
from hydro import run_hydrology
from sun import sun_path
from ai import ask_ai
from slope_aspect import generate_slope_aspect
from fastapi.responses import Response
import json

app = FastAPI(title="Permaculture India – PRO Backend")

# Allow CORS for frontend - comprehensive configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)

# ---- ROUTES -----

@app.get("/")
def health():
    return {"status": "OK", "message": "Permaculture PRO backend running"}

@app.get("/dem")
def dem_endpoint(lat: float, lon: float):
    return get_dem_stats(lat, lon)

@app.get("/dem/tile")
def dem_tile(bbox: str):
    return get_dem_tile(bbox)

@app.get("/contours")
def contour_endpoint(bbox: str, interval: float = 5, bold_interval: int = None):
    """
    Generate accurate contours using SRTM 30m DEM tiles
    Uses GDAL for professional-quality contour extraction
    Processing time: 30-90 seconds (depends on area size)
    
    Args:
        bbox: Bounding box "minx,miny,maxx,maxy"
        interval: Contour interval in meters (0.5, 1, 2, 5, 10, 20, 50, 100)
        bold_interval: Every Nth contour to make bold (e.g., 5 = every 5th contour). Use None or 0 for no bold.
    """
    import time
    start_time = time.time()
    
    # Validate interval
    if interval <= 0:
        return {
            "type": "FeatureCollection",
            "features": [],
            "error": f"Invalid contour interval: {interval}. Must be > 0.",
            "processing_time_seconds": 0
        }
    
    # Normalize bold_interval (0 or None means no bold)
    if bold_interval is not None and bold_interval <= 0:
        bold_interval = None
    
    print(f"[CONTOURS ENDPOINT] Starting FAST contour generation for bbox={bbox}, interval={interval}m, bold_interval={bold_interval}")
    
    try:
        # Always use fast method - optimized for production
        result = generate_contours_fast(bbox, interval=interval, bold_interval=bold_interval)
        
        elapsed = time.time() - start_time
        feature_count = len(result.get('features', []))
        print(f"[CONTOURS ENDPOINT] ✅ SUCCESS: {feature_count} features in {elapsed:.2f}s")
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"[CONTOURS ENDPOINT] ❌ Error after {elapsed:.2f}s: {e}")
        import traceback
        traceback.print_exc()
        return {
            "type": "FeatureCollection",
            "features": [],
            "error": str(e),
            "processing_time_seconds": round(elapsed, 2)
        }

@app.get("/contours/export")
def contour_export_endpoint(bbox: str, interval: float = 5, bold_interval: int = None, format: str = "geojson"):
    """
    Export contours in various formats
    
    Args:
        bbox: Bounding box "minx,miny,maxx,maxy"
        interval: Contour interval in meters
        bold_interval: Every Nth contour to make bold
        format: Export format - "geojson", "json", "kml"
    """
    contours = generate_contours(bbox, interval=interval, bold_interval=bold_interval)
    
    if format.lower() == "geojson" or format.lower() == "json":
        return Response(
            content=json.dumps(contours, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=contours_{interval}m_{bbox.replace(',', '_')}.geojson"
            }
        )
    elif format.lower() == "kml":
        # Convert GeoJSON to KML (simplified)
        kml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n'
        kml += f'<name>Contours {interval}m</name>\n'
        
        for feature in contours.get('features', []):
            elevation = feature.get('properties', {}).get('elevation', 0)
            coords = feature.get('geometry', {}).get('coordinates', [])
            if coords:
                kml += f'<Placemark>\n'
                kml += f'<name>{elevation}m</name>\n'
                kml += f'<LineString>\n<coordinates>'
                for coord in coords[0] if isinstance(coords[0][0], list) else coords:
                    kml += f'{coord[0]},{coord[1]},{coord[2] if len(coord) > 2 else 0} '
                kml += '</coordinates>\n</LineString>\n'
                kml += '</Placemark>\n'
        
        kml += '</Document>\n</kml>'
        
        return Response(
            content=kml,
            media_type="application/vnd.google-earth.kml+xml",
            headers={
                "Content-Disposition": f"attachment; filename=contours_{interval}m_{bbox.replace(',', '_')}.kml"
            }
        )
    else:
        return {"error": "Unsupported format. Use 'geojson', 'json', or 'kml'"}

@app.get("/hydrology")
def hydro_endpoint(bbox: str):
    """Generate hydrology data (catchments, flow accumulation, natural ponds)"""
    try:
        return run_hydrology(bbox)
    except Exception as e:
        print(f"[HYDRO ENDPOINT] Error: {e}")
        return {
            "type": "FeatureCollection",
            "features": [],
            "error": str(e)
        }

@app.get("/sun")
def sun_endpoint(lat: float, lon: float, date: str = "2025-01-01"):
    """Calculate sun path for given location and date"""
    try:
        return sun_path(lat, lon, date)
    except Exception as e:
        print(f"[SUN ENDPOINT] Error: {e}")
        # Return error response that won't break frontend
        return {
            "lat": float(lat),
            "lon": float(lon),
            "date": date,
            "sun_path": [],
            "error": str(e)
        }

@app.post("/ai")
async def ai_endpoint(q: str = Query(...)):
    return ask_ai(q)

@app.get("/slope-aspect")
def slope_aspect_endpoint(bbox: str):
    """
    Generate slope and aspect from DEM
    
    Args:
        bbox: Bounding box "minx,miny,maxx,maxy"
    """
    try:
        return generate_slope_aspect(bbox)
    except Exception as e:
        print(f"[SLOPE-ASPECT ENDPOINT] Error: {e}")
        return {
            "slope": {"type": "FeatureCollection", "features": []},
            "aspect": {"type": "FeatureCollection", "features": []},
            "error": str(e)
        }

@app.get("/slope")
def slope_endpoint(bbox: str):
    """Get slope data only"""
    data = generate_slope_aspect(bbox)
    return data['slope']

@app.get("/aspect")
def aspect_endpoint(bbox: str):
    """Get aspect data only"""
    data = generate_slope_aspect(bbox)
    return data['aspect']

# Run server
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
