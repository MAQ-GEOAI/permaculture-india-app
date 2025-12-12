# Layer Enablement Plan

## Current Status
- Contours: ✅ Working (from backend SRTM DEM)
- Hydrology: ✅ Partially working (catchments, flow, ponds)
- Other layers: ❌ Not implemented (slope, aspect, soil, vegetation, wind, sun path)

## Required Changes

### 1. Fix Basemap Switching
- Currently hardcoded to always use satellite
- Need to allow user to switch between basemap options
- Update basemap useEffect to respect layerVisibility.basemap value

### 2. Backend Endpoints Needed
- `/slope?bbox=...` - Generate slope from DEM
- `/aspect?bbox=...` - Generate aspect from DEM  
- `/soil?bbox=...` - Fetch soil data (ISRIC/OpenLandMap)
- `/vegetation?bbox=...` - Fetch vegetation density
- `/wind?bbox=...` - Fetch wind data (Global Wind Atlas)

### 3. Frontend Updates
- Update runAnalysis to fetch all layers
- Enable all layers by default in layerVisibility state
- Add rendering functions for each layer type
- Update layer toggle UI to show all layers

### 4. Data Sources (from Gemini recommendations)
- **Slope/Aspect**: Derived from SRTM DEM (backend processing)
- **Soil**: ISRIC World Soil Information or OpenLandMap
- **Vegetation**: OpenLandMap vegetation layers
- **Wind**: Global Wind Atlas API
- **Sun Path**: Already implemented, just needs to be enabled

## Implementation Priority
1. Fix basemap switching (quick fix)
2. Enable existing layers (sun path, wind analysis)
3. Add backend endpoints for slope/aspect (DEM-derived)
4. Add external API integrations (soil, vegetation, wind)

