# Permaculture Design Intelligence Platform
## Technical Documentation

**Version 1.0**  
**Last Updated:** January 2025  
**Development Team:** MAQ-GEOAI

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [API Integration](#api-integration)
7. [Deployment](#deployment)
8. [Development Setup](#development-setup)
9. [Code Structure](#code-structure)
10. [Performance Optimization](#performance-optimization)
11. [Security Considerations](#security-considerations)
12. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### System Type

**Single-Page Application (SPA)** built with React and modern web technologies.

### Architecture Pattern

- **Frontend:** React-based client-side application
- **Backend:** RESTful API (FastAPI/Python) for GIS analysis
- **Database:** Firebase Firestore for project persistence
- **Authentication:** Firebase Anonymous Authentication
- **Hosting:** Vercel (Frontend), Render (Backend)

### Design Principles

- **Modularity:** Single-file React component for maintainability
- **Responsiveness:** Mobile-first design approach
- **Performance:** Lazy loading, code splitting, optimized rendering
- **Scalability:** Cloud-based infrastructure
- **User Experience:** Intuitive UI with real-time feedback

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|--------|---------|
| **React** | 18.2.0 | UI framework |
| **Vite** | 5.0.8 | Build tool and dev server |
| **Leaflet.js** | 1.9.4 | Interactive mapping |
| **Firebase** | 10.7.1 | Authentication & database |
| **Tailwind CSS** | CDN | Styling (production: PostCSS) |
| **Lucide React** | 0.294.0 | Icon library |
| **html2canvas** | 1.4.1 | Map export to PNG |
| **jsPDF** | 2.5.1 | PDF generation |

### Backend Technologies

| Technology | Version | Purpose |
|------------|--------|---------|
| **Python** | 3.9+ | Backend language |
| **FastAPI** | Latest | REST API framework |
| **Rasterio** | Latest | Geospatial raster processing |
| **Shapely** | Latest | Geometric operations |
| **NumPy** | Latest | Numerical computations |
| **GDAL** | Latest | Geospatial data abstraction |

### Infrastructure

- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render
- **Database:** Firebase Firestore
- **CDN:** Vercel Edge Network
- **Version Control:** GitHub

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         React Application (SPA)                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │   UI     │  │  Map     │  │  State   │      │   │
│  │  │ Component│  │ Leaflet  │  │Management│      │   │
│  │  └──────────┘  └──────────┘  └──────────┘      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Firebase │         │ Backend │         │  CDN    │
    │ Firestore│         │  API    │         │  Tiles  │
    │   Auth   │         │ Render  │         │         │
    └──────────┘         └──────────┘         └─────────┘
```

### Component Architecture

```
App.jsx (Main Component)
├── Authentication Module
│   ├── Firebase Auth
│   └── User Session Management
├── Map Module
│   ├── Leaflet Map Instance
│   ├── Basemap Management
│   └── Layer Management
├── Project Management
│   ├── Create/Read/Update/Delete
│   └── Firestore Integration
├── Analysis Module
│   ├── Contour Generation
│   ├── Hydrology Analysis
│   ├── Sun Path Calculation
│   └── Wind Analysis
├── Import/Export Module
│   ├── GPX Parser
│   ├── PNG Export
│   └── PDF Export
└── UI Components
    ├── Sidebar
    ├── Map Controls
    └── Modals
```

---

## Core Components

### 1. Map Component

**Technology:** Leaflet.js

**Features:**
- Interactive map with multiple basemaps
- Custom controls and overlays
- Layer management system
- Event handling (click, drag, zoom)

**Implementation:**
```javascript
// Map initialization
const map = L.map(container, {
  center: [20.59, 78.96],
  zoom: 5,
  zoomControl: true
});

// Basemap layer
const tileLayer = L.tileLayer(url, options);
tileLayer.addTo(map);
```

**Key Functions:**
- `initializeMap()` - Creates Leaflet map instance
- `switchBasemap()` - Changes base layer
- `addLayer()` - Adds analysis layer
- `removeLayer()` - Removes layer from map

### 2. Area of Interest (AOI) Drawing

**Technology:** Leaflet Draw (custom implementation)

**Features:**
- Polygon drawing tool
- Real-time vertex placement
- Visual feedback (markers, dashed lines)
- Auto-calculation of statistics

**Implementation:**
```javascript
// Drawing handler
const handleMapClick = (e) => {
  if (drawing) {
    addPointToAOI(e.latlng);
  }
};

// Statistics calculation
const calculateAOIStats = (coordinates) => {
  const area = calculateArea(coordinates);
  const perimeter = calculatePerimeter(coordinates);
  const center = calculateCenter(coordinates);
  return { area, perimeter, center };
};
```

**Data Structure:**
```javascript
{
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[lon, lat], ...]]
  },
  properties: {
    area: 123456, // m²
    perimeter: 1234, // m
    center: [lat, lon]
  }
}
```

### 3. GPX Import Module

**Technology:** DOMParser, Leaflet GeoJSON

**Features:**
- GPX file parsing
- Track, waypoint, and route extraction
- GeoJSON conversion
- Map visualization

**Implementation:**
```javascript
// GPX Parser
const parseGPX = (gpxText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
  
  // Extract tracks
  const tracks = xmlDoc.getElementsByTagName('trk');
  // Extract waypoints
  const waypoints = xmlDoc.getElementsByTagName('wpt');
  
  // Convert to GeoJSON
  return convertToGeoJSON(tracks, waypoints);
};

// Map rendering
const renderGPX = (geojson) => {
  const layer = L.geoJSON(geojson, {
    style: (feature) => {
      if (feature.geometry.type === 'LineString') {
        return { color: '#f59e0b', weight: 3 };
      }
      return { color: '#ef4444', radius: 6 };
    }
  }).addTo(map);
};
```

**Supported GPX Elements:**
- `<trk>` - Tracks (paths)
- `<wpt>` - Waypoints (points)
- `<rte>` - Routes
- `<ele>` - Elevation data
- `<name>` - Names and descriptions

### 4. Analysis Module

**Backend Integration:**
- RESTful API calls to backend
- Fallback visualizations when backend unavailable
- Error handling and retry logic

**Analysis Types:**

#### Contour Analysis
```javascript
// API Call
const response = await fetch(
  `${BACKEND_URL}/contours?bbox=${bbox}&interval=5`
);
const contours = await response.json();

// Rendering
const contourLayer = L.geoJSON(contours, {
  style: { color: '#3b82f6', weight: 1 }
}).addTo(map);
```

#### Hydrology Analysis
```javascript
// API Call
const response = await fetch(
  `${BACKEND_URL}/hydrology?bbox=${bbox}`
);
const hydrology = await response.json();

// Rendering
const flowLayer = L.geoJSON(hydrology.flow, {
  style: { color: '#06b6d4', weight: 2 }
}).addTo(map);
```

#### Sun Path Analysis
```javascript
// API Call
const response = await fetch(
  `${BACKEND_URL}/sun?lat=${lat}&lon=${lon}`
);
const sunData = await response.json();

// Rendering
const sunPath = L.polyline(sunData.path, {
  color: '#f59e0b',
  weight: 3
}).addTo(map);
```

#### Wind Analysis
```javascript
// Client-side calculation
const windAnalysis = generateWindAnalysis(aoi, location);

// Rendering
const windFlow = L.polyline(windAnalysis.flow, {
  color: '#a855f7',
  weight: 2,
  arrows: true
}).addTo(map);
```

### 5. Export Module

**Technologies:** html2canvas, jsPDF

**PNG Export:**
```javascript
const exportMapPNG = async () => {
  // Wait for all tiles to load
  await waitForAllTiles(map);
  
  // Capture map
  const canvas = await html2canvas(mapContainer, {
    scale: 1,
    useCORS: true,
    allowTaint: true
  });
  
  // Download
  const link = document.createElement('a');
  link.download = `map-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
```

**PDF Export:**
```javascript
const exportMapPDF = async () => {
  // Capture map
  const canvas = await html2canvas(mapContainer, options);
  
  // Create PDF
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/png');
  
  // Calculate dimensions
  const pdfWidth = 297; // A4 landscape width
  const pdfHeight = 210; // A4 landscape height
  const imgAspectRatio = canvas.width / canvas.height;
  
  // Add image to PDF
  pdf.addImage(imgData, 'PNG', xOffset, yOffset, width, height);
  pdf.save(`map-${Date.now()}.pdf`);
};
```

**Key Features:**
- Waits for all map tiles to load
- Hides UI controls during export
- Handles tile alignment issues
- Optimized for Leaflet maps

### 6. Project Management

**Firebase Firestore Integration:**
```javascript
// Save Project
const saveProject = async (projectData) => {
  // Serialize GeoJSON for Firestore
  const serialized = serializeForFirestore(projectData);
  
  await setDoc(docRef, {
    name: projectName,
    aoi: serialized.aoi,
    layers: serialized.layers,
    timestamp: serverTimestamp()
  });
};

// Load Project
const loadProject = async (projectId) => {
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  
  // Deserialize GeoJSON
  const deserialized = deserializeFromFirestore(data);
  
  // Restore map state
  restoreMapState(deserialized);
};
```

**Data Serialization:**
- Firestore doesn't support nested arrays
- GeoJSON coordinates converted to JSON strings
- Deserialized on load

---

## Data Flow

### User Interaction Flow

```
User Action
    │
    ├─► Draw AOI
    │   └─► Update State → Render on Map → Calculate Stats
    │
    ├─► Import GPX
    │   └─► Parse File → Convert to GeoJSON → Render on Map
    │
    ├─► Run Analysis
    │   └─► Send Request → Backend Processing → Receive Data → Render Layers
    │
    ├─► Export Map
    │   └─► Wait for Tiles → Capture Canvas → Generate File → Download
    │
    └─► Save Project
        └─► Serialize Data → Save to Firestore → Update UI
```

### Analysis Request Flow

```
1. User clicks "Run Analysis"
   │
2. Frontend prepares request
   ├─► Calculate AOI bounding box
   ├─► Get center coordinates
   └─► Prepare API endpoints
   │
3. Send requests to backend
   ├─► /contours?bbox=...
   ├─► /hydrology?bbox=...
   └─► /sun?lat=...&lon=...
   │
4. Backend processes
   ├─► Download DEM data
   ├─► Generate contours
   ├─► Calculate hydrology
   └─► Compute sun paths
   │
5. Return GeoJSON data
   │
6. Frontend renders
   ├─► Create Leaflet layers
   ├─► Add to map
   └─► Enable layer toggles
```

### Error Handling Flow

```
Request
    │
    ├─► Success → Render Data
    │
    └─► Error
        ├─► Network Error → Show Fallback
        ├─► Backend Unavailable → Use Rule-Based AI
        └─► Invalid Data → Show Error Message
```

---

## API Integration

### Backend API Endpoints

**Base URL:** `https://permaculture-backend.onrender.com`

#### 1. Contour Generation
```
GET /contours?bbox={minLon},{minLat},{maxLon},{maxLat}&interval={interval}
```

**Parameters:**
- `bbox`: Bounding box (comma-separated)
- `interval`: Contour interval in meters (default: 5)

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[lon, lat], ...]
      },
      "properties": {
        "elevation": 100
      }
    }
  ]
}
```

#### 2. Hydrology Analysis
```
GET /hydrology?bbox={minLon},{minLat},{maxLon},{maxLat}
```

**Response:**
```json
{
  "catchments": {...},
  "flow": {...},
  "ponds": {...}
}
```

#### 3. Sun Path Analysis
```
GET /sun?lat={latitude}&lon={longitude}
```

**Response:**
```json
{
  "path": [[lat, lon], ...],
  "sunrise": {...},
  "sunset": {...}
}
```

### Error Handling

**Fallback Strategy:**
- If backend unavailable, use client-side fallback visualizations
- Rule-based AI recommendations when API fails
- Graceful degradation for all features

**Implementation:**
```javascript
try {
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error('API error');
  return await response.json();
} catch (error) {
  logWarn('Backend unavailable, using fallback');
  return createFallbackVisualization();
}
```

---

## Deployment

### Frontend Deployment (Vercel)

**Configuration:**
- **Platform:** Vercel
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 18.x

**Deployment Process:**
1. Push code to GitHub
2. Vercel auto-detects changes
3. Builds application
4. Deploys to CDN
5. Updates production URL

**Environment Variables:**
- None required (Firebase config in code)

**URL:** `https://permaculture-india-app.vercel.app`

### Backend Deployment (Render)

**Configuration:**
- **Platform:** Render
- **Runtime:** Python 3.9+
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
- `PORT`: Auto-assigned by Render
- `CORS_ORIGINS`: Frontend URL

**URL:** `https://permaculture-backend.onrender.com`

### Database (Firebase)

**Configuration:**
- **Service:** Firebase Firestore
- **Region:** Default (multi-region)
- **Security Rules:** User-based access control

**Data Structure:**
```
artifacts/
  └── permaculture-app/
      └── users/
          └── {userId}/
              └── permaculture_projects/
                  └── {projectId}/
                      ├── name: string
                      ├── aoi: string (JSON)
                      ├── layers: string (JSON)
                      └── timestamp: timestamp
```

---

## Development Setup

### Prerequisites

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Git:** Latest version

### Installation

```bash
# Clone repository
git clone https://github.com/MAQ-GEOAI/permaculture-india-app.git
cd permaculture-india-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Server

- **URL:** `http://localhost:3000`
- **Hot Reload:** Enabled
- **Source Maps:** Enabled in development

### Build for Production

```bash
# Build application
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
perma/
├── App.jsx              # Main React component
├── main.jsx             # React entry point
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies
├── vercel.json          # Vercel configuration
├── backend/             # Backend API code
│   ├── main.py
│   ├── contours.py
│   ├── hydrology.py
│   └── utils.py
└── assets/              # Static assets
```

---

## Code Structure

### Main Component (App.jsx)

**Size:** ~3,700 lines (single-file component)

**Sections:**
1. **Imports** (Lines 1-13)
2. **Constants & Configuration** (Lines 15-200)
3. **State Management** (Lines 45-250)
4. **Refs** (Lines 58-220)
5. **Helper Functions** (Lines 250-500)
6. **Firebase Integration** (Lines 500-800)
7. **Map Initialization** (Lines 300-450)
8. **Layer Management** (Lines 450-1000)
9. **Analysis Functions** (Lines 1000-2000)
10. **Import/Export** (Lines 2000-2500)
11. **UI Rendering** (Lines 2500-3700)

### Key Functions

**Map Functions:**
- `initializeMap()` - Creates Leaflet map
- `switchBasemap()` - Changes base layer
- `renderLayer()` - Renders analysis layer
- `toggleLayer()` - Shows/hides layer

**Analysis Functions:**
- `runAnalysis()` - Main analysis orchestrator
- `generateContours()` - Contour generation
- `generateHydrology()` - Water analysis
- `generateSunPath()` - Sun position calculation
- `generateWindAnalysis()` - Wind flow analysis

**Export Functions:**
- `exportMapPNG()` - PNG export
- `exportMapPDF()` - PDF export
- `waitForAllTiles()` - Tile loading wait
- `prepareForExport()` - Export preparation

**Import Functions:**
- `parseGPX()` - GPX file parser
- `handleGPXUpload()` - File upload handler

---

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting:**
   - Lazy loading of heavy libraries
   - Dynamic imports for html2canvas/jsPDF

2. **Map Optimization:**
   - Tile caching
   - Layer visibility toggling
   - Debounced resize handlers

3. **State Management:**
   - useRef for non-reactive data
   - useCallback for event handlers
   - Memoization where appropriate

4. **Rendering:**
   - Conditional rendering
   - Virtual scrolling (if needed)
   - Optimized re-renders

### Backend Optimizations

1. **Caching:**
   - DEM data caching
   - Response caching for repeated requests

2. **Processing:**
   - Async processing for heavy operations
   - Parallel API calls where possible

3. **Data Transfer:**
   - GeoJSON compression
   - Simplified geometries for large datasets

---

## Security Considerations

### Frontend Security

1. **Input Validation:**
   - GPX file validation
   - Coordinate range validation
   - File size limits

2. **XSS Prevention:**
   - React's built-in XSS protection
   - Sanitized user inputs

3. **CORS:**
   - Configured on backend
   - No sensitive data exposure

### Backend Security

1. **API Security:**
   - CORS configuration
   - Rate limiting (recommended)
   - Input validation

2. **Data Security:**
   - No sensitive data storage
   - Secure API endpoints

### Firebase Security

1. **Authentication:**
   - Anonymous authentication
   - User-based data access

2. **Firestore Rules:**
   - User can only access own projects
   - Read/write permissions

---

## Future Enhancements

### Planned Features

1. **3D Terrain View:**
   - Three.js integration
   - Interactive 3D visualization
   - Terrain fly-through

2. **Advanced Analysis:**
   - Soil analysis
   - Vegetation density
   - Slope and aspect calculations

3. **Collaboration:**
   - Multi-user projects
   - Real-time collaboration
   - Project sharing

4. **Mobile App:**
   - React Native version
   - Offline capabilities
   - GPS integration

5. **Enhanced AI:**
   - Machine learning models
   - Predictive analytics
   - Design recommendations

### Technical Improvements

1. **Performance:**
   - Service workers for offline
   - Progressive Web App (PWA)
   - Better caching strategies

2. **Testing:**
   - Unit tests
   - Integration tests
   - E2E tests

3. **Documentation:**
   - API documentation
   - Code comments
   - Architecture diagrams

---

## Conclusion

The Permaculture Design Intelligence Platform is a modern, cloud-based GIS application built with React and Leaflet.js. It provides comprehensive terrain analysis tools for permaculture design, with a focus on user experience and performance.

**Key Achievements:**
- ✅ Single-file React component for maintainability
- ✅ Cloud-based infrastructure for scalability
- ✅ Professional UI/UX design
- ✅ Comprehensive analysis features
- ✅ Robust error handling and fallbacks

**Technology Highlights:**
- Modern React with hooks
- Leaflet.js for mapping
- Firebase for persistence
- Vercel for hosting
- RESTful API architecture

---

**End of Technical Documentation**

For user documentation, see `USER-GUIDE.md`

