# Permaculture Design Intelligence Platform - React Setup

## Overview

This is a single-file React application (`App.jsx`) that provides a comprehensive Permaculture Design Intelligence Platform with Firebase integration, project management, and advanced GIS analysis tools.

## Features

- ✅ **Firebase/Firestore Integration** - Persistent project storage
- ✅ **Project Management** - Create, save, and load projects
- ✅ **Leaflet.js Map** - Interactive mapping with multiple basemaps
- ✅ **Layer Management** - Toggle hydrology, permaculture, and AI recommendation layers
- ✅ **3D Visualization Toggle** - Placeholder for future 3D terrain view
- ✅ **Pond/Earthworks Calculator** - Volume and excavation calculations
- ✅ **Advanced AI Advisory** - Goal-based permaculture strategy generation
- ✅ **Dark Professional UI** - Tailwind CSS with modern design
- ✅ **Responsive Design** - Adaptive layout for all screen sizes

## Prerequisites

- Node.js 18+ and npm/yarn
- Firebase project with Firestore enabled
- Firebase configuration credentials

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   
   Edit `index-react.html` and update the Firebase configuration:
   ```javascript
   window.__firebase_config = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   
   window.__app_id = "permaculture-app";
   window.__initial_auth_token = null; // Optional: set if you have a custom token
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will open at `http://localhost:3000`

## Project Structure

```
perma/
├── App.jsx              # Main React component (single file)
├── main.jsx             # React entry point
├── index-react.html     # HTML template
├── package.json          # Dependencies
├── vite.config.js       # Vite configuration
└── README-REACT.md      # This file
```

## Usage

### 1. Authentication

The app automatically authenticates using:
- Custom token (if `__initial_auth_token` is provided)
- Anonymous authentication (fallback)

Your `userId` is displayed in the header for collaboration reference.

### 2. Project Management

- **Create New Project**: Click "New" and enter a project name
- **Save Project**: Enter project name and click "Save" to persist to Firestore
- **Load Project**: Click on any project in the list to load it

Projects are stored at: `/artifacts/{__app_id}/users/{userId}/permaculture_projects`

### 3. Drawing Area of Interest (AOI)

1. Click "Draw Area" button
2. Click on the map to add points
3. Double-click to finish and create the polygon
4. The AOI will be saved with your project

### 4. Running Analysis

1. Draw an AOI first
2. Click "Run Analysis" button
3. Toggle layers in the sidebar to view results:
   - **Hydrology**: Catchments, Flow Accumulation, Natural Ponds
   - **Permaculture**: Slope, Aspect, Soil Classifier, Vegetation Density
   - **AI Recommendations**: Recommended Swales, Optimal Windbreaks

### 5. Basemap Selection

Choose from:
- **Satellite** - High-resolution imagery
- **Terrain** - Topographic maps
- **OSM** - OpenStreetMap

### 6. Pond Calculator

1. Enter pond area (m²) and depth (m)
2. Click "Calculate"
3. View volume in m³, liters, gallons, and estimated excavation

### 7. AI Advisory

1. Enter a design goal (e.g., "maximize water storage")
2. Click "Generate Strategy"
3. View AI-generated permaculture recommendations

### 8. 3D Visualization

Click "View 3D Terrain" to see a placeholder for future 3D terrain rendering.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Firebase Firestore Structure

```
/artifacts/{__app_id}/users/{userId}/permaculture_projects/{projectId}
  - name: string
  - aoi: GeoJSON
  - analysisLayers: object
  - createdAt: timestamp
  - updatedAt: timestamp
```

## Customization

### Adding Backend Integration

Replace placeholder analysis functions in `App.jsx` with actual API calls:

```javascript
const runAnalysis = async () => {
  // Replace with actual backend API call
  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ aoi })
  });
  const data = await response.json();
  // Update analysisLayers with real data
};
```

### Styling

The app uses Tailwind CSS. Customize colors in the component or add custom CSS classes.

## Troubleshooting

### Leaflet Icons Not Showing

The app includes fixes for Leaflet default icon paths. If icons still don't show, ensure the `leaflet` package is properly installed.

### Firebase Authentication Errors

- Verify your Firebase configuration is correct
- Check that Firestore is enabled in your Firebase project
- Ensure security rules allow read/write access for authenticated users

### Map Not Rendering

- Check browser console for errors
- Ensure Leaflet CSS is loaded
- Verify map container has proper dimensions

## License

MIT License - Free for commercial and personal use.

## Support

For issues or contributions, please refer to the main project repository.

