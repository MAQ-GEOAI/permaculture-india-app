# main.py – FastAPI backend for Permaculture India Pro
import uvicorn
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

from dem import get_dem_stats, get_dem_tile
from contours import generate_contours
from hydro import run_hydrology
from sun import sun_path
from ai import ask_ai

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
def contour_endpoint(bbox: str, interval: int = 2):
    return generate_contours(bbox, interval)

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
