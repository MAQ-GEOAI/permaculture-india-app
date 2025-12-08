# Permaculture Design Intelligence Platform
## User Guide

**Version 1.0**  
**Last Updated:** January 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Features](#core-features)
4. [Step-by-Step Tutorials](#step-by-step-tutorials)
5. [Advanced Features](#advanced-features)
6. [Tips & Best Practices](#tips--best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is This Platform?

The **Permaculture Design Intelligence Platform** is a web-based Geographic Information System (GIS) designed specifically for permaculture design and land analysis. It helps you:

- **Analyze land** for permaculture design
- **Visualize terrain** features (contours, hydrology, sun paths)
- **Plan projects** with data-driven insights
- **Export maps** for presentations and documentation

### Key Benefits

✅ **No Installation Required** - Access directly from your web browser  
✅ **Cloud-Based** - Your projects are saved automatically  
✅ **Professional Analysis** - Get detailed terrain and environmental data  
✅ **Easy Export** - Share maps as PNG or PDF  
✅ **Mobile-Friendly** - Works on tablets and smartphones  

---

## Getting Started

### Accessing the Application

1. **Open your web browser** (Chrome, Firefox, Edge, or Safari recommended)
2. **Navigate to:** `https://permaculture-india-app.vercel.app`
3. **No login required** - Start using immediately!

### First Look

When you open the application, you'll see:

- **Left Sidebar:** Controls and tools for analysis
- **Central Map:** Interactive map showing satellite imagery
- **Top Controls:** Search, basemap, import, export options

---

## Core Features

### 1. Map Navigation

#### Zoom In/Out
- **Mouse Wheel:** Scroll up to zoom in, down to zoom out
- **Zoom Buttons:** Use +/- buttons in top-left corner
- **Double-Click:** Double-click on map to zoom in

#### Pan the Map
- **Click and Drag:** Click and hold, then drag to move the map
- **Arrow Keys:** Use keyboard arrows to pan (when map is focused)

#### Change Basemap
1. Click **"Basemap"** button (top-right)
2. Select from options:
   - **Satellite Imagery** - High-resolution aerial photos
   - **Terrain Topography** - Shows elevation with shading
   - **OpenStreetMap** - Street map view
   - **CartoDB Light/Dark** - Styled maps
   - **Stamen Terrain** - Artistic terrain visualization

---

### 2. Location Search

#### Search by Location Name

**Example: Finding a Location**

1. Click the **"Location"** tab (top-left of map)
2. Type a location name in the search box:
   - `Mumbai, India`
   - `Taj Mahal`
   - `Kerala`
   - `Himalayas`
3. Press **Enter** or click the search icon
4. The map automatically zooms to the location
5. A marker appears showing the exact location

**Tips:**
- Be specific: "Mumbai, India" works better than just "Mumbai"
- Use landmarks: "Taj Mahal" or "Eiffel Tower"
- Include country name for international locations

#### Search by Coordinates

**Example: Navigating to Exact Coordinates**

1. Click the **"Coordinates"** tab
2. Enter **Latitude** (e.g., `26.795774`)
3. Enter **Longitude** (e.g., `88.400156`)
4. Click **"Navigate"**
5. Map zooms to exact coordinates

**Coordinate Format:**
- **Latitude:** -90 to 90 (North/South)
- **Longitude:** -180 to 180 (East/West)
- **Format:** Decimal degrees (e.g., `20.5937`, not `20°35'37"`)

---

### 3. Drawing Area of Interest (AOI)

#### How to Draw an AOI

**Step-by-Step:**

1. Click the **"Draw Area"** button (left sidebar)
2. The button changes to: *"Click map to add points, double-click to finish"*
3. **Click on the map** to place the first point
4. **Continue clicking** to add more points
5. **Double-click** to finish and close the polygon
6. The area is automatically filled with a green overlay

#### Visual Feedback

- **Points:** Green markers show each vertex
- **Lines:** Dashed lines connect points as you draw
- **Polygon:** Green fill shows the completed area

#### AOI Statistics

Once you draw an AOI, statistics appear automatically:

- **Area:** Shown in hectares (ha) and acres
- **Perimeter:** Total boundary length in kilometers
- **Center:** Geographic center coordinates
- **Vertices:** Number of points in the polygon

**Where to See Stats:**
- **Left Sidebar:** "AOI Statistics" section
- **Map Card:** Bottom-left floating information box

#### Clear AOI

- Click **"Clear AOI"** button (red button) to remove the drawn area

---

### 4. Import GPX Files

#### What is a GPX File?

GPX (GPS Exchange Format) files contain GPS tracking data, commonly exported from:
- **GPS devices** (Garmin, etc.)
- **Fitness apps** (Strava, MapMyRun)
- **Hiking apps** (AllTrails, Komoot)
- **Cycling computers**

#### Example: Importing "Mountain Cycling.gpx"

**Step-by-Step Tutorial:**

1. **Prepare Your GPX File**
   - Ensure your file has `.gpx` extension
   - File should contain track or waypoint data
   - Example file: `Mountain Cycling.gpx`

2. **Open Import Menu**
   - Click **"Import"** button (top-right of map)
   - A file picker dialog opens

3. **Select Your File**
   - Navigate to your GPX file location
   - Select the file (e.g., `Mountain Cycling.gpx`)
   - Click **"Open"**

4. **View Results**
   - The map automatically displays your GPX data:
     - **Tracks:** Shown as orange lines
     - **Waypoints:** Shown as red circle markers
   - Map automatically zooms to fit all GPX data
   - Success message shows: "GPX loaded: X features"

5. **Interact with GPX Data**
   - **Click on tracks** to see track names
   - **Click on waypoints** to see waypoint names
   - GPX data overlays on the map with your AOI

#### What Gets Imported?

✅ **Tracks (trk):** Paths/routes as orange lines  
✅ **Waypoints (wpt):** Points of interest as red markers  
✅ **Routes (rte):** Planned routes as lines  
✅ **Elevation Data:** If present in GPX file  
✅ **Names & Descriptions:** Displayed in popups  

#### Supported GPX Features

- Multiple tracks in one file
- Multiple waypoints
- Track segments
- Elevation data
- Names and descriptions
- Timestamps (if available)

#### Tips for GPX Import

- **File Size:** Large GPX files (>10MB) may take longer to load
- **Multiple Files:** Import one file at a time
- **Clear Previous:** New import replaces previous GPX data
- **Combine with AOI:** Draw AOI over imported GPX for analysis

---

### 5. Run Analysis

#### What Analysis Does

When you run analysis, the platform generates:

- **Contour Lines:** Elevation contours showing terrain shape
- **Hydrology:** Water flow paths and catchment areas
- **Sun Path Analysis:** Seasonal sun positions
- **Wind Analysis:** Wind flow patterns and sectors

#### How to Run Analysis

1. **Draw an AOI** (or use existing one)
2. Click **"Run Analysis"** button (left sidebar)
3. Wait for processing (10-30 seconds)
4. Analysis layers appear on the map automatically

#### Analysis Layers

**Terrain:**
- **Contours:** Blue lines showing elevation changes

**Hydrology:**
- **Catchments:** Areas where water collects
- **Flow Accumulation:** Water flow paths
- **Natural Ponds:** Potential pond locations

**Sun Path:**
- **Winter Sunrise/Sunset:** Sun positions in winter
- **Summer Sunrise/Sunset:** Sun positions in summer
- **Daily Sun Path:** Curved line with time markers (6:00, 9:00, 12:00, 15:00, 18:00)

**Wind Analysis:**
- **Wind Flow:** Arrows showing wind direction
- **Primary/Secondary Wind Sectors:** Wind direction ranges
- **Primary/Secondary Wind Areas:** Areas affected by wind

#### Toggle Layers

- Use checkboxes in left sidebar to show/hide specific layers
- Layers can be toggled on/off independently

---

### 6. Export Maps

#### Export as PNG

**Steps:**
1. Prepare your map (draw AOI, run analysis, etc.)
2. Click **"Export"** button (top-right)
3. Select **"PNG"**
4. Wait for processing (may take 10-20 seconds)
5. PNG file downloads automatically

**PNG Export Includes:**
- Complete map view
- All visible layers
- Analysis overlays
- High-quality image

#### Export as PDF

**Steps:**
1. Prepare your map
2. Click **"Export"** button
3. Select **"PDF"**
4. Wait for processing
5. PDF file downloads automatically

**PDF Export Includes:**
- Complete map view
- All visible layers
- Professional formatting
- Ready for printing or sharing

#### Print Map

1. Click **"Export"** button
2. Select **"Print"**
3. Browser print dialog opens
4. Configure print settings
5. Print or save as PDF

#### Share Map

1. Click **"Export"** button
2. Select **"Share"**
3. Share via:
   - Email
   - Social media
   - Link sharing

---

### 7. Project Management

#### Create New Project

1. Enter project name in **"Project name"** field (left sidebar)
2. Click **"+ New"** button
3. Project is created and ready to use

#### Save Project

1. Draw AOI and configure analysis
2. Enter or update project name
3. Click **"Save"** button (green button with disk icon)
4. Success message confirms save

**What Gets Saved:**
- Area of Interest (AOI) geometry
- Analysis layers
- Layer visibility settings
- Project name

#### Load Project

1. Projects appear in sidebar below project name field
2. Click on a project name to load it
3. Map updates with saved AOI and settings

#### Delete Project

1. Find project in sidebar
2. Click **trash icon** next to project name
3. Confirm deletion
4. Project is removed

---

## Advanced Features

### 1. Labels On/Off

**Purpose:** Show or hide all labels and popups on the map

**How to Use:**
1. Click **"Labels"** button (top-right)
2. Toggle to show/hide:
   - Layer popups
   - Feature labels
   - Information markers

**When to Use:**
- **Labels ON:** For detailed analysis
- **Labels OFF:** For cleaner map view in exports

### 2. Legend

**Purpose:** View all map layers and their meanings

**How to Use:**
1. Click **"Legend"** button (top-right)
2. Popup shows:
   - All available layers
   - Color coding
   - Visibility status
   - Layer descriptions

### 3. Pond Calculator

**Purpose:** Calculate water volume for pond design

**How to Use:**
1. Enter **Area** in square meters (e.g., `100`)
2. Enter **Depth** in meters (e.g., `2`)
3. Click **"Calculate"**
4. Results show:
   - Volume in cubic meters
   - Volume in liters
   - Excavation requirements

**Example:**
- Area: `100 m²`
- Depth: `2 m`
- Volume: `200 m³` (200,000 liters)

### 4. AI Advisory

**Purpose:** Get AI-powered permaculture design recommendations

**How to Use:**
1. Draw an AOI
2. Enter a design goal in the text field:
   - "maximize water storage"
   - "create windbreaks"
   - "optimize for food production"
   - "design swale system"
3. Click **"Generate Strategy"**
4. AI recommendations appear in a popup

**Recommendations Include:**
- Water management strategies
- Wind protection plans
- Plantation recommendations
- General design principles

---

## Tips & Best Practices

### For Best Results

1. **Draw Precise AOI**
   - Use zoom to place points accurately
   - More points = more accurate analysis
   - Double-check boundaries before analysis

2. **Wait for Tiles to Load**
   - Let map fully load before export
   - Wait for analysis to complete
   - Check all layers are visible

3. **Use Appropriate Basemap**
   - **Satellite:** Best for terrain visualization
   - **Terrain:** Best for elevation analysis
   - **Street Map:** Best for location reference

4. **Save Projects Regularly**
   - Save after drawing AOI
   - Save after running analysis
   - Use descriptive project names

5. **Export Best Practices**
   - Hide UI controls for cleaner exports (use Labels toggle)
   - Wait for all layers to load
   - Use PNG for digital sharing
   - Use PDF for printing

### Common Workflows

**Workflow 1: Site Analysis**
1. Search for location
2. Draw AOI
3. Run analysis
4. Review all layers
5. Export map

**Workflow 2: GPX Route Planning**
1. Import GPX file
2. Draw AOI around route
3. Run analysis
4. Review terrain features
5. Export for documentation

**Workflow 3: Project Documentation**
1. Load existing project
2. Add analysis layers
3. Toggle labels on/off
4. Export as PDF
5. Share with team

---

## Troubleshooting

### Map Not Loading

**Problem:** Map shows blank or loading forever

**Solutions:**
- Refresh the page (F5 or Ctrl+R)
- Check internet connection
- Try different browser
- Clear browser cache

### Analysis Not Working

**Problem:** "Run Analysis" doesn't produce results

**Solutions:**
- Ensure AOI is drawn first
- Wait for processing to complete
- Check if layers are enabled in sidebar
- Refresh page and try again

### Export Issues

**Problem:** Export produces blank or scattered image

**Solutions:**
- Wait for all map tiles to load (10-20 seconds)
- Ensure map is fully rendered
- Try exporting again
- Clear browser cache

### GPX Import Fails

**Problem:** GPX file doesn't import

**Solutions:**
- Ensure file has `.gpx` extension
- Check file is valid GPX format
- Try smaller file (<10MB)
- Verify file contains track/waypoint data

### Project Not Saving

**Problem:** Project doesn't save

**Solutions:**
- Enter a project name
- Ensure you have internet connection
- Check browser console for errors
- Try refreshing and saving again

---

## Support & Contact

### Getting Help

- **Check this guide** for common issues
- **Review troubleshooting** section above
- **Contact support** for technical issues

### Application Information

- **Version:** 1.0
- **Platform:** Web-based (no installation)
- **Browser Support:** Chrome, Firefox, Edge, Safari
- **Mobile Support:** Yes (responsive design)

---

## Appendix

### Keyboard Shortcuts

- **Zoom In:** Mouse wheel up, or `+` key
- **Zoom Out:** Mouse wheel down, or `-` key
- **Pan:** Arrow keys (when map focused)
- **Search:** `Ctrl+F` (browser search)

### File Formats

- **Import:** `.gpx` files only
- **Export:** `.png`, `.pdf`
- **Project Data:** Saved in cloud (Firebase)

### System Requirements

- **Internet Connection:** Required
- **Browser:** Modern browser (Chrome, Firefox, Edge, Safari)
- **Screen Resolution:** Minimum 1024x768
- **JavaScript:** Must be enabled

---

**End of User Guide**

For technical documentation, see `TECHNICAL-DOCUMENTATION.md`

