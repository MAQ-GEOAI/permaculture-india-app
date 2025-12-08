# Testing Guide - Contour Improvements

## Quick Start Testing

### Option 1: Test Locally (Recommended for Development)

#### Step 1: Start Backend Server

Open a **new terminal** and run:

```bash
# Navigate to backend folder
cd D:\MAQ\Biz\permaculture\perma\backend

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start backend server
python main.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Verify Backend:**
- Open browser: `http://localhost:8000`
- Should see: `{"status": "OK", "message": "Permaculture PRO backend running"}`

#### Step 2: Start Frontend

Open **another terminal** and run:

```bash
# Navigate to project root
cd D:\MAQ\Biz\permaculture\perma

# Start frontend dev server
npm run dev
```

**Expected Output:**
```
VITE v5.0.8  ready in 500 ms
➜  Local:   http://localhost:3000/
```

#### Step 3: Open Application

Open browser: `http://localhost:3000`

---

### Option 2: Test on Production (Vercel)

**Frontend URL:** `https://permaculture-india-app.vercel.app`

**Backend URL:** `https://permaculture-backend.onrender.com` (or your deployed backend)

**Note:** Make sure backend is deployed and running before testing.

---

## Testing Checklist

### ✅ Test 1: Basic Contour Generation

**Steps:**
1. Open the application (local or production)
2. **Search for an Indian location:**
   - Type: `Mumbai, India` in search bar
   - Press Enter
   - Map zooms to Mumbai

3. **Draw Area of Interest:**
   - Click "Draw Area" button (left sidebar)
   - Click on map to place points
   - Double-click to finish
   - AOI should appear with green fill

4. **Check Contour Settings:**
   - Look for "Contour Settings" panel in sidebar
   - Verify interval selector shows: 0.5m, 1m, 2m, 5m, 10m, 20m, 50m, 100m
   - Default should be: **5m**

5. **Run Analysis:**
   - Click "Run Analysis" button
   - Wait 10-30 seconds
   - Contours should appear on map

**Expected Results:**
- ✅ Contours appear as blue lines
- ✅ Success message: "Contours generated: X lines (5m interval)"
- ✅ Contours layer checkbox is checked in sidebar
- ✅ Contours are visible on map

---

### ✅ Test 2: Contour Interval Selection

**Steps:**
1. Draw AOI (if not already done)
2. **Change Contour Interval:**
   - In "Contour Settings" panel
   - Select different intervals:
     - **0.5m** - Very detailed (many lines)
     - **1m** - Detailed
     - **2m** - Medium detail
     - **5m** - Default
     - **10m** - Less detail
     - **20m** - Overview
     - **50m** - Large scale
     - **100m** - Very large scale

3. **Run Analysis** for each interval

**Expected Results:**
- ✅ Smaller intervals (0.5m, 1m) = More contour lines
- ✅ Larger intervals (50m, 100m) = Fewer contour lines
- ✅ Processing time increases with smaller intervals
- ✅ All intervals generate valid contours

---

### ✅ Test 3: Bold Contours

**Steps:**
1. Draw AOI
2. **Set Bold Interval:**
   - In "Contour Settings" panel
   - Select "Bold Every Nth Contour"
   - Try: Every 5th, Every 10th, Every 20th

3. **Run Analysis**

**Expected Results:**
- ✅ Some contour lines are thicker (bold)
- ✅ Bold contours are more visible
- ✅ Regular contours are thinner
- ✅ Bold contours appear at correct intervals

**Visual Check:**
- Bold contours: **2.5px** thick, darker blue
- Regular contours: **1px** thick, lighter blue

---

### ✅ Test 4: Elevation Labels

**Steps:**
1. Draw AOI and run analysis (contours should be visible)
2. **Toggle Labels:**
   - In "Contour Settings" panel
   - Click "Show Elevation Labels" toggle
   - Should show: **ON** or **OFF**

3. **Test Both States:**
   - **ON:** Labels appear on contour lines
   - **OFF:** Labels disappear

**Expected Results:**
- ✅ Labels show elevation (e.g., "100m", "105m", "110m")
- ✅ Labels positioned at midpoint of contour lines
- ✅ Labels have white background with colored border
- ✅ Toggle works instantly (no need to re-run analysis)
- ✅ Labels match contour colors

**Visual Check:**
- Labels: White background, colored border, small text
- Text shadow for readability
- Positioned on contour lines

---

### ✅ Test 5: Color Gradients

**Steps:**
1. Draw AOI in different elevation areas:
   - **Coastal:** Mumbai (low elevation)
   - **Hills:** Shimla (medium elevation)
   - **Mountains:** Leh (high elevation)

2. Run analysis for each location

**Expected Results:**
- ✅ **Low elevation (< 100m):** Blue contours
- ✅ **Medium (100-500m):** Green contours
- ✅ **Hills (500-1000m):** Orange contours
- ✅ **Mountains (1000-2000m):** Red contours
- ✅ **High mountains (> 2000m):** Purple contours

**Note:** Colors may vary based on actual DEM data.

---

### ✅ Test 6: Export Raw Contour Data

**Steps:**
1. Draw AOI and run analysis
2. **Export Data:**
   - In "Contour Settings" panel
   - Click "Export Raw Contour Data (GeoJSON)" button
   - File should download automatically

3. **Verify File:**
   - Filename: `contours_5m_1234567890.geojson`
   - Open file in text editor
   - Should be valid JSON

4. **Test in GIS Software (Optional):**
   - Open in QGIS or ArcGIS
   - Contours should display correctly
   - Elevation values should be in properties

**Expected Results:**
- ✅ File downloads successfully
- ✅ Filename includes interval and timestamp
- ✅ File is valid GeoJSON
- ✅ Contains all contour features
- ✅ Elevation values are correct

---

### ✅ Test 7: Different Indian Locations

**Test Locations:**

1. **Mumbai (Coastal, Low Elevation)**
   - Search: `Mumbai, India`
   - Draw small AOI
   - Use 2m or 5m interval
   - Should show gentle contours

2. **Delhi (Plains, Moderate Elevation)**
   - Search: `New Delhi, India`
   - Draw AOI
   - Use 5m interval
   - Should show flat to gentle contours

3. **Shimla (Hills, High Elevation)**
   - Search: `Shimla, India`
   - Draw AOI
   - Use 10m interval
   - Should show steep contours

4. **Leh (Mountains, Very High Elevation)**
   - Search: `Leh, India`
   - Draw AOI
   - Use 20m or 50m interval
   - Should show very steep contours

**Expected Results:**
- ✅ All locations generate contours
- ✅ Contours match terrain type
- ✅ No errors in console
- ✅ Processing completes successfully

---

### ✅ Test 8: Error Handling

**Test Scenarios:**

1. **Backend Unavailable:**
   - Stop backend server
   - Run analysis
   - Should show fallback contours
   - Message: "Using fallback contours (backend unavailable)"

2. **Invalid AOI:**
   - Try to run analysis without AOI
   - Should show error: "Please draw an Area of Interest first"

3. **Very Large Area:**
   - Draw very large AOI (zoom out, draw big polygon)
   - Run analysis
   - May take longer (30-60 seconds)
   - Should complete or show timeout message

**Expected Results:**
- ✅ Graceful error handling
- ✅ User-friendly error messages
- ✅ Fallback visualizations work
- ✅ No crashes or blank screens

---

### ✅ Test 9: Performance

**Test Large Areas:**

1. Draw large AOI (several kilometers)
2. Use fine interval (0.5m or 1m)
3. Run analysis
4. Monitor:
   - Processing time
   - Browser performance
   - Memory usage

**Expected Results:**
- ✅ Processing completes (may take 1-2 minutes)
- ✅ Browser remains responsive
- ✅ No memory leaks
- ✅ Can interact with map during processing

**Performance Tips:**
- Use larger intervals (10m, 20m) for large areas
- Use smaller intervals (0.5m, 1m) for small areas
- Toggle labels off if many contours

---

### ✅ Test 10: Layer Toggle

**Steps:**
1. Draw AOI and run analysis
2. **Toggle Contours Layer:**
   - In sidebar, find "Contours" checkbox
   - Uncheck to hide
   - Check to show

**Expected Results:**
- ✅ Contours disappear when unchecked
- ✅ Contours reappear when checked
- ✅ Labels also hide/show with contours
- ✅ No errors in console

---

## Testing URLs

### Local Testing
- **Frontend:** `http://localhost:3000`
- **Backend:** `http://localhost:8000`
- **Backend Health:** `http://localhost:8000/`

### Production Testing
- **Frontend:** `https://permaculture-india-app.vercel.app`
- **Backend:** `https://permaculture-backend.onrender.com` (or your backend URL)
- **Backend Health:** `https://permaculture-backend.onrender.com/`

---

## Quick Test Commands

### Test Backend API Directly

```bash
# Test contour endpoint
curl "http://localhost:8000/contours?bbox=72.8,19.0,72.9,19.1&interval=5&bold_interval=5"

# Test with different interval
curl "http://localhost:8000/contours?bbox=72.8,19.0,72.9,19.1&interval=10"

# Test health endpoint
curl "http://localhost:8000/"
```

**Expected Response:**
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
        "elevation": 100,
        "name": "100m",
        "bold": false,
        "weight": 1,
        "color": "#3b82f6"
      }
    }
  ],
  "properties": {
    "interval": 5,
    "bold_interval": 5,
    "count": 10,
    "bbox": "72.8,19.0,72.9,19.1"
  }
}
```

---

## Browser Console Checks

**Open Developer Tools (F12) and check:**

1. **No Errors:**
   - Console should show no red errors
   - Only warnings are acceptable (if any)

2. **Network Tab:**
   - Contour request: `GET /contours?bbox=...&interval=...`
   - Status: `200 OK`
   - Response time: < 30 seconds (usually)

3. **Performance:**
   - No memory leaks
   - Smooth map interaction
   - No lag when toggling layers

---

## Common Issues & Solutions

### Issue: Contours Not Appearing

**Check:**
1. Backend is running (`http://localhost:8000`)
2. No CORS errors in console
3. AOI is drawn correctly
4. Network request succeeded (check Network tab)

**Solution:**
- Restart backend server
- Clear browser cache
- Check backend logs for errors

### Issue: Labels Not Showing

**Check:**
1. "Show Elevation Labels" is ON
2. Contours are visible
3. Zoom level is appropriate (labels may hide at very zoomed out)

**Solution:**
- Toggle labels off and on
- Zoom in closer
- Re-run analysis

### Issue: Slow Performance

**Check:**
1. Area size (very large areas are slow)
2. Contour interval (smaller = more lines = slower)
3. Browser memory usage

**Solution:**
- Use larger interval (10m, 20m) for large areas
- Draw smaller AOI
- Close other browser tabs
- Toggle labels off

### Issue: Export Not Working

**Check:**
1. Contours are loaded
2. Browser allows downloads
3. No popup blockers

**Solution:**
- Allow downloads in browser settings
- Disable popup blockers
- Try different browser

---

## Success Criteria

✅ **All tests pass:**
- Contours generate successfully
- All intervals work
- Bold contours visible
- Labels toggle correctly
- Export works
- No errors in console
- Performance is acceptable

✅ **Visual Quality:**
- Contours match terrain
- Colors are appropriate
- Labels are readable
- Bold contours are distinct

✅ **User Experience:**
- Intuitive controls
- Clear feedback
- Fast response
- No crashes

---

## Next Steps After Testing

1. **If All Tests Pass:**
   - Deploy backend to Render
   - Deploy frontend to Vercel
   - Share with business users

2. **If Issues Found:**
   - Check browser console for errors
   - Check backend logs
   - Review CONTOUR-IMPROVEMENTS.md for details
   - Report specific issues

---

**Happy Testing! 🎉**

For questions or issues, check:
- `CONTOUR-IMPROVEMENTS.md` - Technical details
- `USER-GUIDE.md` - User documentation
- Browser console for errors

