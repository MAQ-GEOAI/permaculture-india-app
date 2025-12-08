# main.py – FastAPI backend for Permaculture India Pro
import uvicorn
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

from dem import get_dem_stats, get_dem_tile
from contours import generate_contours
from hydro import run_hydrology
from sun import sun_path
from ai import ask_ai
from fastapi.responses import Response
import json

app = FastAPI(title="Permaculture India – PRO Backend")

# Allow CORS for frontend (GitHub Pages / Netlify)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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
    Generate contours with professional features
    
    Args:
        bbox: Bounding box "minx,miny,maxx,maxy"
        interval: Contour interval in meters (0.5, 1, 2, 5, 10, 20, 50, 100)
        bold_interval: Every Nth contour to make bold (e.g., 5 = every 5th contour)
    """
    return generate_contours(bbox, interval=interval, bold_interval=bold_interval)

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
    return run_hydrology(bbox)

@app.get("/sun")
def sun_endpoint(lat: float, lon: float, date: str = "2025-01-01"):
    return sun_path(lat, lon, date)

@app.post("/ai")
async def ai_endpoint(q: str = Query(...)):
    return ask_ai(q)

# Run server
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
